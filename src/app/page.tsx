"use client";
import axios from "axios";
import { useState, useCallback } from "react";

const Page = () => {
  const [status, setStatus] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  // Function to dynamically load reCAPTCHA script
  const loadRecaptchaScript = useCallback((siteKey: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!document.getElementById("recaptcha-script")) {
        const script = document.createElement("script");
        script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
        script.id = "recaptcha-script";
        script.async = true;
        script.onload = () => {
          try {
            (window as any).grecaptcha.ready(() => {
              // setIsScriptReady(true);
              resolve();
            });
          } catch (error) {
            reject("Failed to load reCAPTCHA script.");
          }
        };
        script.onerror = () => reject("Failed to load reCAPTCHA script.");
        document.body.appendChild(script);
      } else {
        resolve();
      }
    });
  }, []);

  const runRecaptcha = async (siteKey: string) => {
    if (!(window as any).grecaptcha) {
      setStatus("❌ reCAPTCHA not ready");
      console.log("reCAPTCHA is not ready, check the script load status.");
      return;
    }

    try {
      const recaptchaToken = await (window as any).grecaptcha.execute(siteKey, {
        action: "form",
      });
      setStatus("✅ Filling forms automatically...");
      return recaptchaToken;
    } catch (error) {
      console.error("Error while executing reCAPTCHA:", error);
      setStatus("❌ Error in reCAPTCHA execution");
    }
  };

  const handleGetToken = async () => {
    if (isRunning) return;
    setIsRunning(true);

    const interval = setInterval(async () => {
      try {
        const res = await axios.put("/api/getToken");
        console.log(res.data.isNew, res.data.siteKey);

        if (res.data.isNew && res.data.siteKey) {
          const siteKey = res.data.siteKey;
          console.log("Using siteKey:", siteKey); // Debugging siteKey

          // Wait for the script to load and be ready
          await loadRecaptchaScript(siteKey);
          await new Promise<void>((resolve) => setTimeout(resolve, 1000));
          const token = await runRecaptcha(siteKey);
          if (token) {
            console.log("Token received:", token); // Debugging the token value

            const config = {
              headers: {
                "Content-Type": "application/json",
                Token: `${token}`,
              },
            };

            // Post the token to the API
            await axios.post("/api/getToken", { isToken: true }, config);
          } else {
            console.log("Token was undefined, retrying...");
          }
        }
      } catch (error: any) {
        setStatus(`❌ Failed: ${error.message}`);
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 1000);

    // Cleanup interval on component unmount or when isRunning is false
    return () => clearInterval(interval);
  };

  return (
    <>
      <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center text-white bg-black/50 backdrop-blur">
        <h1 className="text-2xl mb-6">
          ReCaptcha v3 Token Generator
        </h1>
        <button
          onClick={handleGetToken}
          disabled={isRunning}
          className="bg-blue-600 px-6 py-3 rounded-md text-lg font-semibold disabled:opacity-50"
        >
          {isRunning ? "Running..." : "Start Token Generating"}
        </button>
        <p className="mt-4">{status}</p>
      </div>
    </>
  );
};

export default Page;
