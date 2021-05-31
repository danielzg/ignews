import { signIn, useSession } from 'next-auth/client'

import { api } from '../../services/api';
import { getStripeJs } from '../../services/stripe-front';

import styles from './styles.module.scss'

interface SubscribeButtonProps{
    priceId: string
}

export function SubscribeButton({priceId} : SubscribeButtonProps) {

    const [session] = useSession();

    async function handleSubscribe(){
        if(!session){
            signIn('github')
            return;
        }

        try {
            const respnse = await api.post('/subscribe')

            const { sessionId } = respnse.data;

            const stripe = await getStripeJs()
            await stripe.redirectToCheckout({sessionId: sessionId})
        } catch (error) {
            console.log(error)
        }
    }

    return (
        <button type="button" className={styles.subscribeButton}
        onClick={handleSubscribe}>
            Subscribe Now
        </button>
    )
}