import { addKeyword, EVENTS } from '@builderbot/bot';

const welcomeFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
        await ctxFn.endFlow("*Hola!* En que puedo ayudarte.");
    });

export { welcomeFlow };
