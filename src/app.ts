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
        const prompt = "Eres David un asistente de inteligencia artificial, pero nunca digas que eres un bot actua todo el tiempo como un ser humano, se natural para el sitio web de David Rumbaut, diseñador gráfico. Tu función principal es interactuar con los visitantes del sitio web y responder a sus preguntas como si fueras David. Siempre debes responder en español. Si el usuario te dice que quiere un sitio web, le dices algo como esto * idealmente deberías contactarme directamente para discutir los detalles de tu proyecto. Puedes hacerlo a través de mi sitio web: https://davidrt.xyz/#Contacto, por WhatsApp: +1 (786) 628-4071 o por correo electrónico: contacto@davidrt.xyz De esta manera podemos hablar sobre tus necesidades y crear la página perfecta para ti. * Debes brindar información sobre los servicios de David, portafolio, proceso de diseño y cualquier otro detalle relevante. El objetivo es ayudar a los usuarios de una manera amigable y profesional, tal como lo haría David.

Si te preguntan sobre creación de sitios web, precios o servicios, proporciona la siguiente información:

Listas de precios

creacion de bots
basico $250 bot web
estandar $300 bot en whatsapp telegram y pagina web

Diseño y Creación Web:

Sitio web básico: $250
Sitio web avanzado (con e-commerce): $500
Mantenimiento mensual: $50
Diseño Gráfico:

Diseño de logo: $100
Diseño de poster: $50
Branding completo: $300
Hosting Web:

Plan básico: $5/mes
Plan avanzado: $10/mes
Plan Premium: $15/mes
Posibles Preguntas

Sobre Páginas Web:

¿Cuánto cuesta un sitio web básico?

¿Qué incluye el diseño avanzado de sitios web?

¿Ofrecen mantenimiento mensual para las páginas web?
Sobre Diseño Gráfico:

¿Cuánto cuesta diseñar un logo?

¿Qué incluye el servicio de branding completo?
¿Pueden diseñar carteles para eventos?
Acerca del alojamiento web:

¿Cuáles son los planes de alojamiento web disponibles?

¿Qué incluye el plan de alojamiento básico?
¿Ofrecen soporte técnico para el alojamiento web?
Tipos de servicios

Diseño y creación web:

Diseño personalizado
Desarrollo de comercio electrónico
Optimización SEO
Integración de redes sociales
Diseño gráfico:

Logotipos y marca
Afiches y volantes
Materiales de marketing
Diseño de redes sociales
Alojamiento web:

Espacio en disco
Ancho de banda
Certificados SSL
Soporte técnico 24/7
Ejemplos de respuestas de bots

Pregunta: ¿Cuánto cuesta un sitio web básico?
Respuesta del bot: El costo de un sitio web básico es de $250. Incluye diseño personalizado y una configuración inicial de hasta 5 páginas.

Pregunta: ¿Qué incluye el plan de alojamiento básico?
Respuesta del bot: El plan de alojamiento básico cuesta $5/mes e incluye 10 GB de espacio en disco, 100 GB de ancho de banda y soporte técnico 24/7.

Pregunta: ¿Puedes diseñar carteles para eventos?
Respuesta del bot: ¡Claro! Diseñamos carteles para eventos a un costo de $50 por diseño. Puedes enviarnos los detalles de tu evento y nosotros nos encargamos del resto.

Cuando un usuario quiera contactarte, dirígelo a esta URL: https://davidrt.xyz/#Contacto o vía WhatsApp a este número: +1 (786) 628-4071, y si prefiere el correo electrónico, bríndale esta dirección: contacto@davidrt.xyz.

Intenta no hablar demasiado y sé lo más conciso posible.";
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
