var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
import { EmailMessage } from "cloudflare:email";
var LIMITE_CAMPO = 2e3;
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contacto") {
      if (request.method !== "POST") return texto("M\xE9todo no permitido", 405);
      return recibirContacto(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
var texto = /* @__PURE__ */ __name((mensaje, estado) => new Response(JSON.stringify({ mensaje }), {
  status: estado,
  headers: { "content-type": "application/json; charset=utf-8" }
}), "texto");
async function recibirContacto(request, env) {
  let datos;
  try {
    datos = Object.fromEntries(await request.formData());
  } catch {
    return texto("No he entendido el formulario.", 400);
  }
  if (datos.web) return texto("Gracias.", 200);
  const nombre = recortar(datos.nombre);
  const email = recortar(datos.email);
  const mensaje = recortar(datos.mensaje);
  if (!nombre || !email || !mensaje) return texto("Faltan campos por rellenar.", 400);
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) return texto("Ese email no parece v\xE1lido.", 400);
  try {
    await env.EMAIL.send(
      new EmailMessage(env.REMITENTE, env.DESTINO, correo({ nombre, email, mensaje, env }))
    );
  } catch (err) {
    console.error("Fallo al enviar", err);
    return texto("No he podido enviar el mensaje. Prueba a llamar o escribir por email.", 502);
  }
  return texto("Mensaje enviado. Te contesto en cuanto pueda.", 200);
}
__name(recibirContacto, "recibirContacto");
var recortar = /* @__PURE__ */ __name((valor) => String(valor ?? "").trim().slice(0, LIMITE_CAMPO), "recortar");
function correo({ nombre, email, mensaje, env }) {
  const cuerpo = [
    mensaje,
    "",
    "\u2014",
    `De: ${nombre}`,
    `Email: ${email}`,
    "Enviado desde el formulario de lindairiane.com"
  ].join("\r\n");
  const corto = paraCabecera(nombre);
  return [
    `From: Web Linda Iriane <${env.REMITENTE}>`,
    `To: <${env.DESTINO}>`,
    // Así, al darle a responder, la respuesta va a quien escribió.
    `Reply-To: "${corto}" <${email}>`,
    `Subject: ${asunto(`Contacto web \u2014 ${corto}`)}`,
    `Message-ID: <${crypto.randomUUID()}@lindairiane.com>`,
    `Date: ${fechaRfc()}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64texto(cuerpo).replace(/(.{76})/g, "$1\r\n")
  ].join("\r\n");
}
__name(correo, "correo");
var b64 = /* @__PURE__ */ __name((bytes) => {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}, "b64");
var b64texto = /* @__PURE__ */ __name((s) => b64(new TextEncoder().encode(s)), "b64texto");
function asunto(texto2) {
  const bytes = new TextEncoder().encode(texto2);
  const trozos = [];
  for (let i = 0; i < bytes.length; ) {
    let fin = Math.min(i + 42, bytes.length);
    while (fin > i && fin < bytes.length && (bytes[fin] & 192) === 128) fin--;
    trozos.push(`=?utf-8?B?${b64(bytes.subarray(i, fin))}?=`);
    i = fin;
  }
  return trozos.join("\r\n ");
}
__name(asunto, "asunto");
var paraCabecera = /* @__PURE__ */ __name((valor) => valor.replace(/[\r\n"<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 50) || "sin nombre", "paraCabecera");
var fechaRfc = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toUTCString().replace("GMT", "+0000"), "fechaRfc");

// ../../.npm/_npx/d77349f55c2be1c0/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../.npm/_npx/d77349f55c2be1c0/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-3bqOzA/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../.npm/_npx/d77349f55c2be1c0/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-3bqOzA/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
