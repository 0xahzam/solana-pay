"use client";
import { PublicKey, Connection, clusterApiUrl, Keypair } from "@solana/web3.js";
import {
  encodeURL,
  createQR,
  findReference,
  validateTransfer,
  FindReferenceError,
} from "@solana/pay";
import QRCodeStyling from "@solana/qr-code-styling";
import BigNumber from "bignumber.js";
import { useState, useEffect, useCallback } from "react";

interface URLParams {
  recipient: PublicKey;
  amount: BigNumber;
  reference: PublicKey;
  label: string;
  message: string;
  memo: string;
}

async function generateQR(params: URLParams): Promise<QRCodeStyling> {
  const url = encodeURL(params);
  console.log(url);
  const qrCode = createQR(url, 250, "transparent", "#FFFFFF");
  return qrCode;
}

async function getPaymentParams(): Promise<URLParams> {
  const recipient = new PublicKey(
    "2FJZ49vWsN3LE3tmNsd14DmtSmxNtsr32vsrgKBUv77p"
  );
  const amount = new BigNumber(0.3);
  const reference = Keypair.generate().publicKey;
  const label = "Nighthawk Model Shop";
  const message = "F-117 Nighthawk Model";
  const memo = "NIGHTHAWK#001";

  return { recipient, amount, reference, label, message, memo };
}

async function findTransaction(
  connection: Connection,
  reference: PublicKey
): Promise<string> {
  try {
    const signatureInfo = await findReference(connection, reference, {
      finality: "confirmed",
    });
    console.log("Signature found:", signatureInfo.signature);
    return signatureInfo.signature;
  } catch (error) {
    if (error instanceof FindReferenceError) {
      console.log("Transaction not found yet. Retrying...");
      throw error;
    } else {
      console.error("Error finding transaction:", error);
      throw error;
    }
  }
}

async function validateTransaction(
  connection: Connection,
  signature: string,
  recipient: PublicKey,
  amount: BigNumber
): Promise<void> {
  try {
    await validateTransfer(connection, signature, {
      recipient: recipient,
      amount: amount,
    });
    console.log("Payment validated");
  } catch (error) {
    console.error("Payment failed", error);
    throw error;
  }
}

export default function Page() {
  const [qrCode, setQrCode] = useState<QRCodeStyling | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<
    "pending" | "confirmed" | "validated" | "failed" | null
  >(null);
  const [paymentParams, setPaymentParams] = useState<URLParams | null>(null);

  const handleBuyNow = async () => {
    setIsLoading(true);
    setTransactionStatus(null);
    try {
      const params = await getPaymentParams();
      setPaymentParams(params);
      const generatedQR = await generateQR(params);
      setQrCode(generatedQR);
      setTransactionStatus("pending");
    } catch (error) {
      console.error("Error generating QR code:", error);
      setTransactionStatus("failed");
    } finally {
      setIsLoading(false);
    }
  };

  const findAndValidateTransaction = useCallback(async () => {
    if (!paymentParams) return;

    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const checkTransaction = async () => {
      try {
        const signature = await findTransaction(
          connection,
          paymentParams.reference
        );
        setTransactionStatus("confirmed");
        await validateTransaction(
          connection,
          signature,
          paymentParams.recipient,
          paymentParams.amount
        );
        setTransactionStatus("validated");
      } catch (error) {
        if (error instanceof FindReferenceError) {
          setTimeout(checkTransaction, 1000);
        } else {
          console.error("Transaction validation failed:", error);
          setTransactionStatus("failed");
        }
      }
    };

    checkTransaction();
  }, [paymentParams]);

  useEffect(() => {
    if (transactionStatus === "pending") {
      findAndValidateTransaction();
    }
  }, [transactionStatus, findAndValidateTransaction]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 to-black p-4">
      <div className="max-w-4xl w-full bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-700">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/2 p-8">
            <h1 className="text-3xl font-bold mb-6 text-blue-400">
              ✈️ Nighthawk Model Shop
            </h1>
            <img
              src="https://m.media-amazon.com/images/I/61TI6VC4Y-L.jpg"
              alt="Nighthawk Model"
              className="rounded-lg shadow-md mb-6 w-full object-cover h-64"
            />
            <h2 className="text-2xl font-semibold mb-2 text-white">
              F-117 Nighthawk Model
            </h2>
            <p className="text-gray-400 mb-4">
              Precision-crafted stealth fighter model for aviation enthusiasts!
            </p>
            <p className="text-3xl font-bold text-green-400 mb-6">0.3 SOL</p>
            <button
              onClick={handleBuyNow}
              disabled={isLoading || transactionStatus === "pending"}
              className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-full hover:bg-blue-700 transition duration-300 shadow-md disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Buy Now with Solana"}
            </button>
          </div>
          <div className="md:w-1/2 bg-gray-800 p-8 flex items-center justify-center">
            {qrCode ? (
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-4 text-white">
                  {transactionStatus === "validated"
                    ? "Payment Complete!"
                    : "Scan to Pay"}
                </h3>
                <div className="bg-gray-700 p-4 rounded-lg shadow-md inline-block">
                  {transactionStatus === "validated" ? (
                    <div className="text-green-400 text-4xl">✅</div>
                  ) : (
                    <div
                      ref={(el) => {
                        if (el && qrCode) {
                          el.innerHTML = "";
                          qrCode.append(el);
                        }
                      }}
                    />
                  )}
                </div>
                {transactionStatus === "pending" && (
                  <p className="text-yellow-400 mt-4">Waiting for payment...</p>
                )}
                {transactionStatus === "confirmed" && (
                  <p className="text-yellow-400 mt-4">
                    Transaction confirmed, validating...
                  </p>
                )}
                {transactionStatus === "failed" && (
                  <p className="text-red-400 mt-4">
                    Transaction failed. Please try again.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <p className="text-xl mb-2">Ready for takeoff?</p>
                <p>Click "Buy Now" to generate a QR code for payment.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
