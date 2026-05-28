const siteUrl =
  process.env.CONVEX_SITE_URL ?? process.env.SITE_URL ?? "http://127.0.0.1:3211";

const authConfig = {
  providers: [
    {
      domain: siteUrl,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
