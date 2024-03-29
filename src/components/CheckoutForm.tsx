import { useEffect, useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useLoading } from "../hooks/useLoading";
import { Link } from "react-router-dom";
import { Item } from "../types/item";

interface Props {
    itemToBuy: Item | null;
}

export default function CheckoutForm({ itemToBuy }: Props) {
    const stripe = useStripe();
    const elements = useElements();

    const [message, setMessage] = useState<string | undefined>("");
    const { loading, setLoading } = useLoading();

    useEffect(() => {
        if (!stripe) {
            return;
        }

        const clientSecret = new URLSearchParams(window.location.search).get("payment_intent_client_secret");
        console.log(clientSecret);

        //it seems normally never run as clientSecret in URLSearchParams is always null
        if (!clientSecret) {
            return;
        }

        stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
            if (paymentIntent) {
                console.log(paymentIntent.status);
                switch (paymentIntent.status) {
                    case "succeeded":
                        setMessage("Payment succeeded!");
                        break;
                    case "processing":
                        setMessage("Your payment is processing.");
                        break;
                    case "requires_payment_method":
                        setMessage("Your payment was not successful, please try again.");
                        break;
                    default:
                        setMessage("Something went wrong.");
                        break;
                }
            }
        });
    }, [stripe]);

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!stripe || !elements || !itemToBuy) {
            return;
        }
        setLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Make sure to change this to your payment completion page
                return_url: `http://localhost:5173/payment-success/${itemToBuy.id}`,
            },
        });

        if (error && (error.type === "card_error" || error.type === "validation_error")) {
            setMessage(error.message);
        } else {
            setMessage("An unexpected error occurred.");
        }

        setLoading(false);
    };

    const paymentElementOptions = {
        layout: "tabs" as const,
    };

    return (
        <form id="payment-form" onSubmit={handleSubmit}>
            <PaymentElement id="payment-element" options={paymentElementOptions} />
            <div style={{ display: "flex", justifyContent: "center" }}>
                <Link to="/">
                    <button
                        style={{
                            marginTop: "20px",
                            marginRight: "50px",
                            width: "150px",
                            height: "40px",
                            fontSize: "16px",
                        }}
                    >
                        Cancel
                    </button>
                </Link>
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <button
                        disabled={loading || !stripe || !elements}
                        id="submit"
                        style={{
                            marginTop: "20px",
                            width: "150px",
                            height: "40px",
                            fontSize: "16px",
                        }}
                    >
                        <span id="button-text">
                            {loading ? (
                                <div className="spinner" id="spinner">
                                    Waiting
                                </div>
                            ) : (
                                "Pay now"
                            )}
                        </span>
                    </button>
                    {/* Show any error or success messages */}
                    {message && <div id="payment-message">{message}</div>}
                </div>
            </div>
        </form>
    );
}
