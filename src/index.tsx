import { Context, Hono, Next } from "hono";
import { Login } from "./components/Login";
import { getCookie, setCookie } from "hono/cookie";
import { randomUUID } from "crypto";
import { createClient } from 'redis';
import { Index } from "./components/Index";
import { Layout } from "./components/Layout";

// Load environment variables
export const { PASSWORD, URL_MAP, REDIS_URL, NODE_ENV } = process.env;
if (!PASSWORD) {
  throw new Error("PASSWORD is not set");
}
if (!URL_MAP) {
  throw new Error("URL_MAP is not set");
}
if (!REDIS_URL) {
  throw new Error("REDIS_URL is not set");
}
export const urlMap: { [key: string]: string } = JSON.parse(URL_MAP);

// Redis client
const redisClient = createClient({ url: REDIS_URL });
redisClient.on("error", (err) => console.error(err));
await redisClient.connect();

const app = new Hono();

const checkSessionID = async (c: Context, next: Next) => {
  const sessionId = getCookie(c, "session_id");
  if (!(sessionId && await redisClient.get(`k8sproxy:sessions:${sessionId}`))) {
    return c.redirect("/login");
  }
  await next();
}

// Index page
app.get(
  "/",
  checkSessionID,
  async (c) => {
    const paths = Object.keys(urlMap);
    return c.html(<Index paths={paths} />);
  }
)

// Login page
app.get(
  "/login",
  async (c, next) => {
    // Check session ID
    const sessionId = getCookie(c, "session_id");
    if (await redisClient.get(`k8sproxy:sessions:${sessionId}`)) {
      return c.redirect("/");
    }
    await next();
  },
  async (c) => {
    const host = c.req.header("Host")!;
    return c.html(<Login />);
  },
);

// Login post
app.post("/login", async (c) => {
  const { password } = await c.req.parseBody();

  // Check password
  if (typeof password !== "string" || btoa(password) !== PASSWORD) {
    return c.html(<Login msg="Invalid password" />, 401);
  }

  // Set session ID
  const sessionId = randomUUID({});
  redisClient.set(`k8sproxy:sessions:${sessionId}`, sessionId, {
    EX: 60 * 60 * 24 * 30,
  });
  setCookie(c, "session_id", sessionId,
    {
      path: "/",
      secure: NODE_ENV === "production",
      domain: new URL(c.req.url).hostname,
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      sameSite: NODE_ENV === "production" ? "None" : "Lax",
    })
  return c.redirect("/");
});

app.all(
  "/:svc",
  checkSessionID,
  async (c) => {
    // Rewrite only the URL portion and proxy it.
    const svc = c.req.param("svc");
    if (!(svc in urlMap)) {
      return c.html(<Layout>404: Service not found</Layout>, 404);
    }
    const url = urlMap[svc];
    const raw = c.req.raw;
    const req = new Request(`${url}`, { ...raw });
    return fetch(req);
  },
)

app.all(
  "/:svc/:path",
  checkSessionID,
  async (c) => {
    // Rewrite only the URL portion and proxy it.
    const svc = c.req.param("svc");
    const path = c.req.param("path");
    if (!(svc in urlMap)) {
      return c.html(<Layout>404: Service not found</Layout>, 404);
    }
    const url = urlMap[svc];
    const raw = c.req.raw;
    const req = new Request(`${url}/${path}`, { ...raw });
    return fetch(req);
  },
);

export default app;
