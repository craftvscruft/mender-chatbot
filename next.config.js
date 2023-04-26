/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // For AWS Amplify.
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
  },
}
module.exports = nextConfig
