import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";

import { faunadb } from "../../services/fauna";
import {query as q} from 'faunadb'

import { stripe } from "../../services/stripe";

type User ={
    ref: {
        id: string
    },
    data: {
        stripe_customer_id: string
    }
}

export default async(req: NextApiRequest, response: NextApiResponse) => {

    if(req.method === 'POST'){
        const session = await getSession({ req })

        const user = await faunadb.query<User>(
            q.Get(
                q.Match(
                    q.Index('user_by_email'),
                    q.Casefold(session.user.email)
                )
            )
        )

        let customer_id = user.data.stripe_customer_id

        if(!customer_id){
            const stripeCustomer = await stripe.customers.create({
                email: session.user.email
            })
            
            await faunadb.query(
                q.Update(
                    q.Ref(q.Collection('users'), user.ref.id),
                    {
                        data: {
                            stripe_customer_id: stripeCustomer.id
                        }
                    }
                )
            )
            customer_id = stripeCustomer.id
        }
                    
        const  stripeCheckOutSession = await stripe.checkout.sessions.create({
            customer: customer_id,
            payment_method_types: ['card'],
            billing_address_collection: "required",
            line_items: [
                {
                    price: 'price_1IuhUWGD2wYqStJQbeAT35Nh', quantity: 1
                }
            ],
            mode: 'subscription',
            allow_promotion_codes: true,
            success_url: process.env.STRIPE_SUCCESS_URL,
            cancel_url: process.env.STRIPE_CANCEL_URL
        })

        return response.status(200).json({sessionId: stripeCheckOutSession.id})
    } else {
        response.setHeader('Allow', 'POST')
        response.status(405).end('Method not allowed')
    }
}