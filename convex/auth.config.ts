const siteUrl =
  process.env.CONVEX_SITE_URL ?? process.env.SITE_URL ?? "http://127.0.0.1:3211";

export default {
  providers: [
    {
      domain: siteUrl,
      applicationID: "convex",
    },
  ],
};
