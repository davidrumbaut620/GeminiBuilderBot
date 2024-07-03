import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'

const PORT = process.env.PORT ?? 3009

import { welcomeFlow } from './flows/welcome.flow';
import { chat } from './scripts/gemini'

const mainFlow = addKeyword<Provider, Database>(EVENTS.WELCOME)
    .addAction(async (ctx, ctxFn) => {
        const bodyText: string = ctx.body.toLowerCase();

        //Primero, el usuario esta saludando?
        const keywords: string[] = ["hola", "buenas", "ola"];
        const containsKeyword: boolean = keywords.some(keyword => bodyText.includes(keyword));
        if (containsKeyword) {
            return await ctxFn.gotoFlow(welcomeFlow); //Si, esta saludando, delegar al welcome flow
        } //No, no esta saludando

        //Entonces habla con una AI!
        const prompt = "You are DavidBot, an artificial intelligence assistant for the website of David Rumbaut, a graphic designer. Your main role is to interact with website visitors and answer their questions as if you were David. You must always respond in Spanish. If the user tells you they want a website, you say something like this * ideally you should contact me directly to discuss the details of your project. You can do it through my website: https://davidrt.xyz/#Contacto, by WhatsApp: +1 (786) 628-4071 or by email: contacto@davidrt.xyz This way we can talk about your needs and create the perfect page for you. *You should provide information about David's services, portfolio, design process, and any other relevant details. The goal is to help users in a friendly and professional way, just like David would.

If they ask about creating websites, prices, or services, provide the following information:

Price Lists

creacion de bots
        basico $250 bot web
        estandar $300 bot en whatsapp telegram y pagina web

Web Design and Creation:

Basic website: $250
Advanced website (with e-commerce): $500
Monthly maintenance: $50
Graphic Design:

Logo design: $100
Poster design: $50
Complete branding: $300
Web Hosting:

Basic plan: $5/month
Advanced plan: $10/month
Premium plan: $15/month
Possible Questions

About Web Pages:

How much does a basic website cost?
What does advanced website design include?
Do you offer monthly maintenance for the web pages?
About Graphic Design:

How much does it cost to design a logo?
What does the complete branding service include?
Can you design posters for events?
About Web Hosting:

What are the available web hosting plans?
What does the basic hosting plan include?
Do you offer technical support for web hosting?
Types of Services

Web Design and Creation:

Personalized design
E-commerce development
SEO Optimization
Social media integration
Graphic Design:

Logos and branding
Posters and flyers
Marketing materials
Social media design
Web Hosting:

Disk space
Bandwidth
SSL certificates
24/7 technical support
Examples of Bot Responses

Question: How much does a basic website cost?
Bot Response: The cost of a basic website is $250. It includes custom design and an initial setup of up to 5 pages.

Question: What does the basic hosting plan include?
Bot Answer: The basic hosting plan costs $5/month and includes 10GB of disk space, 100GB of bandwidth, and 24/7 technical support.

Question: Can you design posters for events?
Bot Response: Sure! We design posters for events at a cost of $50 per design. You can send us the details of your event, and we will take care of the rest.

When a user wants to contact, direct them to this URL: https://davidrt.xyz/#Contacto or via WhatsApp at this number: +1 (786) 628-4071, and if they prefer email, give them this address: contacto@davidrt.xyz.

Try not to talk too much and be as concise as possible.";
        const text = ctx.body;
        const response = await chat(prompt, text);
        await ctxFn.flowDynamic(response);
    })


const main = async () => {
    const adapterFlow = createFlow([welcomeFlow, mainFlow])

    const adapterProvider = createProvider(Provider)
    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body
            await bot.sendMessage(number, message, { media: urlMedia ?? null })
            return res.end('sended')
        })
    )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('REGISTER_FLOW', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('SAMPLES', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    httpServer(+PORT)
}

main()
