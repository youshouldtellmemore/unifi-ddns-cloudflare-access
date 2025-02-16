# 🌩️ UniFi DDNS to Cloudflare ZeroTrust Access Policy IP include rule

[![CodeQL](https://github.com/youshouldtellmemore/unifi-ddns/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/youshouldtellmemore/unifi-ddns/actions/workflows/github-code-scanning/codeql)
[![Code Coverage](https://github.com/youshouldtellmemore/unifi-ddns/actions/workflows/coverage.yml/badge.svg)](https://github.com/youshouldtellmemore/unifi-ddns/actions/workflows/coverage.yml)
[![Dependabot Updates](https://github.com/youshouldtellmemore/unifi-ddns/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/youshouldtellmemore/unifi-ddns/actions/workflows/dependabot/dependabot-updates)
[![Deploy](https://github.com/youshouldtellmemore/unifi-ddns/actions/workflows/deploy.yml/badge.svg)](https://github.com/youshouldtellmemore/unifi-ddns/actions/workflows/deploy.yml)

A Cloudflare Worker script that adapts https://github.com/willswire/unifi-ddns to enable UniFi devices (e.g., UDM-Pro, USG) to dynamically update Cloudflare ZeroTrust Access Policy's IP include rule.

## Why Use This?

DDNS publicly exposes your IP, which isn't always desired. Since UniFi devices don't natively support DDNS for Cloudflare, a custom solution is already required.

This project modifies https://github.com/willswire/unifi-ddns to update an Access Policy's IP include rule by overloading how your UniFi devices can issue DDNS requests.

## 🚀 **Setup Overview**

### 1. **Deploy the Cloudflare Worker**

#### **Option 1: Click to Deploy**
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/youshouldtellmemore/unifi-ddns)

1. Click the button above.
2. Complete the deployment.
3. Note the `*.workers.dev` route.

#### **Option 2: Deploy with Wrangler CLI**
1. Clone this repository.
2. Install [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/).
3. Run:
   ```sh
   wrangler login
   wrangler deploy
   ```
4. Note the `*.workers.dev` route.

### 2. **Generate Cloudflare API Tokens**

A Cloudflare *user* API token is required for deployment to Cloudflare.
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Profile > API Tokens**
3. Create a token using the **Create Custom Token** template.
4. Grant permissions:
	- Account: Workers KV Storage: Edit
    - Account: Workers Script: Edit
5. Save the token securely.

Different permissions are necessary for use of the Worker Script, so we'll create one more **user** API token.
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Profile > API Tokens**
3. Create a token using the **Create Custom Token** template.
4. Grant permissions:
   - Account: Workers KV Storage: Read
   - Account: Access: Apps and Policies: Edit
5. Save the token securely.

### 3. **ZeroTrust Access Policy**

This guide assumes you already use Cloudflare ZeroTrust, have an Access Policy with an **include** rule for **IP**. You will need this rule's Access Policy ID for the next step.


### 4. **Cloudflare KV Storage**

Since ZeroTrust Access Policy IDs should be private, we'll use a Cloudflare KV namespace to obfuscate with a mapping of friendly names to ZeroTrust Access Policy IDs.

To create the KV namespace to store ZeroTrust Access Policy IDs allowed to be dynamically updates:
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Storage & Databases > KV**.
3. Create a KV namespace using any name you like.
4. Save the KV namespace.

Add key/value pairs for each Access Policy IP with an IP include rule allowed to be modified.
1. Key: a friendly name we'll use later when configuring the UniFi device's 'hostname' parameter.
2. Value: the Access Policy ID to have its IP include rules updated.

### 5. **Configure/Review Environment Secrets**

Wrangler use from the automated GitHub deployment action depends on a few Repository Secrets. If these aren't configured, or need to be changed:
1. Navigate to **Settings > Security > Secrets and variables > Actions**.
2. Under **Repository Secrets** make sure you see (values will be hidden):
   - CLOUDFLARE_ACCOUNT_ID
   - CLOUDFLARE_API_TOKEN
   - CLOUDFLARE_NAMESPACE_ID

### 6. **Configure UniFi OS**

By modifying the intent of a couple UniFi DDNS parameters, the Worker Script is instructed to modify an Access Policy IP include rule with a new IP for bearer's of an allowed API token.
1. Log in to your [UniFi OS Controller](https://unifi.ui.com/).
2. Go to **Settings > Internet > WAN > Dynamic DNS**.
3. Create New Dynamic DNS with the following information:
   - **Service:** `custom`
   - **Hostname:** `mykey` or `home`
   - **Username:** This must be set but can be anything (e.g., `building1-udm`)
   - **Password:** Cloudflare User API Token for Worker Script *(not an Account API Token)*
   - **Server:** `<worker-name>.<worker-subdomain>.workers.dev/update?ip=%i&hostname=%h`
     *(Omit `https://`)*

Requests are made using https, which can be verified in Cloudflare Worker Logs later. The hostname is a key in the KV namespace, mapping to an Access Policy ID.

## 🛠️ **Testing & Troubleshooting**

Using this script with various Ubiquiti devices and different UniFi software versions can introduce unique challenges. If you encounter issues, start by checking the FAQ in `/docs/faq.md`. If you don’t find a solution, you can ask a question on the [discussions page](https://github.com/youshouldtellmemore/unifi-ddns/discussions/new?category=q-a). If the problem persists, please raise an issue [here](https://github.com/youshouldtellmemore/unifi-ddns/issues).
