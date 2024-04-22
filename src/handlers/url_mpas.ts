import { H } from "hono/types";
import { urlMapRepository } from "../db";

export const addUrlMapHandler: H = async (c) => {
  const { subdomain, proxyTo, isSecure } = await c.req.parseBody();
  if (typeof subdomain !== "string" || typeof proxyTo !== "string" || typeof isSecure !== "boolean") {
    return c.html("Invalid request", 400);
  }
  await urlMapRepository.addUrlMap({ subdomain, proxyTo, isSecure });
  return c.redirect("/");
}

export const deleteUrlMapHandler: H = async (c) => {
  const subdomain = c.req.param("subdomain");
  await urlMapRepository.deleteUrlMap(subdomain);
  return c.redirect("/");
}

export const updateUrlMapHandler: H = async (c) => {
  const subdomain = c.req.param("subdomain");
  const { proxyTo, isSecure } = await c.req.parseBody();
  if (typeof proxyTo !== "string") {
    return c.html("Invalid request A", 400);
  }
  await urlMapRepository.updateUrlMap({ subdomain, proxyTo: proxyTo || "", isSecure: isSecure === "on" });
  return c.redirect("/");
}
