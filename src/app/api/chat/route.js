import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/* -------------------------------------------------------
   SA TOURS CONTACT DETAILS
------------------------------------------------------- */
const CONTACTS = {
    helpline: "8805718986",
    booking: "9209471601",
    borliBus: "9209471309",
    dighiBus: "9273635316",
};

/* -------------------------------------------------------
   ROUTE DETAILS
------------------------------------------------------- */
const ROUTES = [
    {
        name: "Dighi → Dongri",
        timing: "3:00 AM to 9:00 AM",
        type: "Morning Departure",
        busNumber: CONTACTS.dighiBus,
    },
    {
        name: "Borli → Dongri",
        timing: "4:00 AM to 9:30 AM",
        type: "Morning Departure",
        busNumber: CONTACTS.borliBus,
    },
    {
        name: "Dongri → Borli",
        timing: "2:00 PM to 8:30 PM",
        type: "Evening Return",
        busNumber: CONTACTS.borliBus,
    },
    {
        name: "Dongri → Dighi",
        timing: "4:00 PM to 10:30 PM",
        type: "Evening Return",
        busNumber: CONTACTS.dighiBus,
    },
];

/* -------------------------------------------------------
   SYSTEM PROMPT FOR GEMINI
------------------------------------------------------- */
const SYSTEM_PROMPT = `
You are the official AI assistant for SA Tours & Travels.

Your job:
- Help users with bus booking questions
- Help with route timings
- Help with pickup/drop points
- Help with fares
- Help with contact details
- Help with booking support
- Help with payment support
- Answer politely and professionally
- Keep responses short, clear, and useful
- Use simple English
- Be helpful for Indian bus travel customers

Business details:
- Company name: SA Tours & Travels
- Service type: Daily Bus Service + Private booking

Contact details:
- Helpline number: ${CONTACTS.helpline}
- Booking number: ${CONTACTS.booking}
- Borli ↔ Dongri bus number: ${CONTACTS.borliBus}
- Dighi ↔ Dongri bus number: ${CONTACTS.dighiBus}

Main routes:
1. Dighi → Dongri (Morning) - Bus: ${CONTACTS.dighiBus}
2. Borli → Dongri (Morning) - Bus: ${CONTACTS.borliBus}
3. Dongri → Borli (Return) - Bus: ${CONTACTS.borliBus}
4. Dongri → Dighi (Return) - Bus: ${CONTACTS.dighiBus}

Known timings:
- Dighi → Dongri: 3:00 AM to 9:00 AM
- Borli → Dongri: 4:00 AM to 9:30 AM
- Dongri → Borli: 2:00 PM to 8:30 PM
- Dongri → Dighi: 4:00 PM to 10:30 PM

Rules:
- If the user asks about booking, tell them to use the Book Now option on the website and mention booking number ${CONTACTS.booking}.
- If the user asks about urgent confirmation/payment issues, tell them to call helpline ${CONTACTS.helpline}.
- If the user asks about Borli route, mention bus number ${CONTACTS.borliBus}.
- If the user asks about Dighi route, mention bus number ${CONTACTS.dighiBus}.
- If the user asks something unrelated to SA Tours, politely say you mainly help with SA Tours services.
- Never claim to confirm a real booking unless the website backend actually provides that.
- Never invent payment success.
- If fare is not known from the user’s exact route, say: "Please select your pickup, drop, and travel date in the booking page to see the exact fare."
- Keep answers concise and natural.
`;

/* -------------------------------------------------------
   LOCAL SMART FALLBACK BOT
   (Used when Gemini quota/model fails)
------------------------------------------------------- */
function getLocalBotReply(message = "") {
    const text = String(message).toLowerCase().trim();

    const fullContactBlock = `SA Tours & Travels contact details:

• Helpline: ${CONTACTS.helpline}
• Booking contact: ${CONTACTS.booking}
• Borli ↔ Dongri bus number: ${CONTACTS.borliBus}
• Dighi ↔ Dongri bus number: ${CONTACTS.dighiBus}`;

    // Timings / schedule
    if (
        text.includes("timing") ||
        text.includes("schedule") ||
        text.includes("today bus") ||
        text.includes("today’s bus") ||
        text.includes("today bus timings") ||
        text.includes("bus timings")
    ) {
        return `Here are today’s bus timings for SA Tours & Travels:

• Dighi → Dongri: 3:00 AM to 9:00 AM (Bus: ${CONTACTS.dighiBus})
• Borli → Dongri: 4:00 AM to 9:30 AM (Bus: ${CONTACTS.borliBus})
• Dongri → Borli: 2:00 PM to 8:30 PM (Bus: ${CONTACTS.borliBus})
• Dongri → Dighi: 4:00 PM to 10:30 PM (Bus: ${CONTACTS.dighiBus})

${fullContactBlock}`;
    }

    // Booking
    if (
        text.includes("book") ||
        text.includes("booking") ||
        text.includes("book seat") ||
        text.includes("how can i book")
    ) {
        return `You can book your seat from the Book Now option on the website.

Steps:
1. Open the booking page
2. Select bus route
3. Select travel date
4. Choose pickup and drop
5. Select seat
6. Complete payment

For booking help:
• Booking contact: ${CONTACTS.booking}
• Helpline: ${CONTACTS.helpline}`;
    }

    // Fare
    if (
        text.includes("fare") ||
        text.includes("price") ||
        text.includes("ticket price") ||
        text.includes("cost")
    ) {
        return `To see the exact fare, please select your pickup point, drop point, and travel date on the booking page.

The fare depends on:
• Pickup location
• Drop location
• Travel date
• Active fare rules

For fare help:
• Booking contact: ${CONTACTS.booking}
• Helpline: ${CONTACTS.helpline}`;
    }

    // Contact / support
    if (
        text.includes("contact") ||
        text.includes("phone") ||
        text.includes("number") ||
        text.includes("support") ||
        text.includes("call") ||
        text.includes("helpline")
    ) {
        return fullContactBlock;
    }

    // Borli route specific
    if (
        text.includes("borli") ||
        text.includes("borli mumbai") ||
        text.includes("bus no 2pm") ||
        text.includes("2pm bus")
    ) {
        return `Borli ↔ Dongri / Borli Mumbai route details:

• Route: Borli → Dongri
• Morning timing: 4:00 AM to 9:30 AM
• Return timing: Dongri → Borli, 2:00 PM to 8:30 PM
• Borli bus number: ${CONTACTS.borliBus}

For booking:
• Booking contact: ${CONTACTS.booking}

For urgent help:
• Helpline: ${CONTACTS.helpline}`;
    }

    // Dighi route specific
    if (
        text.includes("dighi") ||
        text.includes("dighi mumbai") ||
        text.includes("bus no 4pm") ||
        text.includes("4pm bus")
    ) {
        return `Dighi ↔ Dongri / Dighi Mumbai route details:

• Route: Dighi → Dongri
• Morning timing: 3:00 AM to 9:00 AM
• Return timing: Dongri → Dighi, 4:00 PM to 10:30 PM
• Dighi bus number: ${CONTACTS.dighiBus}

For booking:
• Booking contact: ${CONTACTS.booking}

For urgent help:
• Helpline: ${CONTACTS.helpline}`;
    }

    // Routes
    if (
        text.includes("route") ||
        text.includes("routes") ||
        text.includes("available route") ||
        text.includes("which route")
    ) {
        return `Available routes:

• Dighi → Dongri (Bus: ${CONTACTS.dighiBus})
• Borli → Dongri (Bus: ${CONTACTS.borliBus})
• Dongri → Borli (Bus: ${CONTACTS.borliBus})
• Dongri → Dighi (Bus: ${CONTACTS.dighiBus})

Main route coverage:
Dighi / Borli ↔ Dongri`;
    }

    // Payment
    if (
        text.includes("payment") ||
        text.includes("paid") ||
        text.includes("razorpay") ||
        text.includes("transaction")
    ) {
        return `For payment-related issues, please first check your booking notification or payment status in the website.

If payment is deducted but booking is not confirmed:

• Helpline: ${CONTACTS.helpline}
• Booking contact: ${CONTACTS.booking}

Please keep your payment ID ready while contacting support.`;
    }

    // Pickup / drop
    if (
        text.includes("pickup") ||
        text.includes("drop") ||
        text.includes("boarding") ||
        text.includes("destination")
    ) {
        return `You can select your pickup and drop point on the booking page after choosing the bus and travel date.

If you want the exact available stops, please open the Schedule section and select your route.

Useful contacts:
• Helpline: ${CONTACTS.helpline}
• Booking contact: ${CONTACTS.booking}`;
    }

    // Default
    return `Hello 👋 Welcome to SA Tours & Travels.

I can help you with:
• Bus timings
• Route details
• Booking help
• Fare help
• Contact numbers
• Payment support

Contact details:
• Helpline: ${CONTACTS.helpline}
• Booking contact: ${CONTACTS.booking}
• Borli ↔ Dongri bus number: ${CONTACTS.borliBus}
• Dighi ↔ Dongri bus number: ${CONTACTS.dighiBus}

You can ask:
• What are today’s bus timings?
• How can I book a seat?
• What is the fare?
• What are the available routes?`;
}

/* -------------------------------------------------------
   GEMINI REQUEST
------------------------------------------------------- */
async function getGeminiReply(prompt) {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: prompt }],
                    },
                ],
                generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens: 500,
                },
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        return {
            ok: false,
            error: data?.error?.message || "Gemini API request failed.",
            data,
        };
    }

    const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    return {
        ok: true,
        reply,
    };
}

/* -------------------------------------------------------
   POST HANDLER
------------------------------------------------------- */
export async function POST(req) {
    try {
        const body = await req.json();
        const messages = Array.isArray(body?.messages) ? body.messages : [];

        const latestUserMessage =
            [...messages].reverse().find((m) => m?.role === "user")?.content || "";

        if (!latestUserMessage.trim()) {
            return NextResponse.json(
                { error: "User message is required." },
                { status: 400 }
            );
        }

        // If no API key -> local fallback
        if (!GEMINI_API_KEY) {
            return NextResponse.json({
                reply: getLocalBotReply(latestUserMessage),
                source: "local-fallback",
            });
        }

        const conversationText = messages
            .slice(-10)
            .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
            .join("\n");

        const prompt = `${SYSTEM_PROMPT}

Conversation:
${conversationText}

User's latest question:
${latestUserMessage}

Now answer as SA Tours & Travels AI assistant.`;

        const gemini = await getGeminiReply(prompt);

        // If Gemini fails -> local fallback (NO raw error shown to user)
        if (!gemini.ok) {
            console.error("Gemini API error:", gemini.error);

            return NextResponse.json({
                reply: getLocalBotReply(latestUserMessage),
                source: "local-fallback",
                modelTried: GEMINI_MODEL,
            });
        }

        return NextResponse.json({
            reply: gemini.reply || getLocalBotReply(latestUserMessage),
            source: "gemini",
            modelUsed: GEMINI_MODEL,
        });
    } catch (error) {
        console.error("Chat API error:", error);

        return NextResponse.json({
            reply: getLocalBotReply(""),
            source: "local-fallback",
        });
    }
}