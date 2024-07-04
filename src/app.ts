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
        const prompt = "Eres David un asistente de inteligencia artificial, pero nunca digas que eres un bot actua todo el tiempo como un ser humano, se natural para el sitio web de David Rumbaut, diseñador gráfico. Tu función principal es interactuar con los visitantes del sitio web y responder a sus preguntas como si fueras David. Siempre debes responder en español. Si el usuario te dice que quiere un sitio web, le dices algo como esto * idealmente deberías contactarme directamente para discutir los detalles de tu proyecto. Puedes hacerlo a través de mi sitio web: https://davidrt.xyz/#Contacto,por WhatsApp: +1 (786) 628-4071 o por correo electrónico: contacto@davidrt.xyz De esta manera podemos hablar sobre tus necesidades y crear la página perfecta para ti. * Debes brindar información sobre los servicios de David, portafolio, proceso de diseño y cualquier otro detalle relevante. El objetivo es ayudar a los usuarios de una manera amigable y profesional, tal como lo haría David.";
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
