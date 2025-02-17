# 🌩️ Cloudflare Access Policy DDNS (Dynamic DNS) support for UniFi OS

[![CodeQL](https://github.com/youshouldtellmemore/unifi-ddns-cloudflare-access/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/youshouldtellmemore/unifi-ddns-cloudflare-access/actions/workflows/github-code-scanning/codeql)
[![Code Coverage](https://github.com/youshouldtellmemore/unifi-ddns-cloudflare-access/actions/workflows/coverage.yml/badge.svg)](https://github.com/youshouldtellmemore/unifi-ddns-cloudflare-access/actions/workflows/coverage.yml)
[![Dependabot Updates](https://github.com/youshouldtellmemore/unifi-ddns-cloudflare-access/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/youshouldtellmemore/unifi-ddns-cloudflare-access/actions/workflows/dependabot/dependabot-updates)
[![Deploy](https://github.com/youshouldtellmemore/unifi-ddns-cloudflare-access/actions/workflows/deploy.yml/badge.svg)](https://github.com/youshouldtellmemore/unifi-ddns-cloudflare-access/actions/workflows/deploy.yml)

A Cloudflare Worker script that provides DDNS functionality to your Zero Trust Access IP rules, piggybacking off of how UniFi uses [inadyn](https://github.com/troglobit/inadyn) to send DDNS updates. Adapted from [unifi-ddns](https://github.com/willswire/unifi-ddns).

The Worker Script handles the DDNS request to:
- Validate authorization header.
- Parse query parameters `hostname` for the Access Policy, and `ip` for the new IP address.
- Update the Access Policy's IP include rules with new IP.

The Policy ID is masked using a friendly name mapped to a Policy ID via a key-value pair in a Cloudflare KV Storage namespace.

## Why Use This?

After moving my domains to Cloudflare, setting up a tunnel, and beginning to play with Zero Trust Access, I was looking for DDNS for a Zero Trust Access Policy IP rule.

Since UniFi devices don't natively support DDNS for Cloudflare anyway, a popular search result for Cloudflare and DDNS is https://github.com/willswire/unifi-ddns. Adapting this solution helped me learn GitHub Workflows, GitHub Actions, TypeScript, npm, Cloudflare Workers, and Cloudflare KV Storage.

## 🚀 **Setup**

The deployment to Cloudflare is managed with GitHub Actions and Workflows. The DDNS client is then configured to use the Worker Script.

### 1. **Cloudflare Configuration**

It's assumed you already have a Cloudflare account and Zero Trust setup.

#### 1.1 **Create Cloudflare API deployment token**

The GitHub deployment workflow requires Cloudflare API access via a Cloudflare API **user** token.

To create a token:
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Profile > API Tokens**
3. Create a token using the **Create Custom Token** template.
4. Grant permissions:
	- Account: Workers KV Storage: Edit
    - Account: Workers Script: Edit
5. Save the token securely. You will need this later.

#### 1.2 **Create Cloudflare API DDNS token**

A separate token should be used for the DDNS client to make changes to the Access Policy's IP include rules.

To configure another **user** token:
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Profile > API Tokens**
3. Create a token using the **Create Custom Token** template.
4. Grant permissions:
   - Account: Workers KV Storage: Read
   - Account: Access: Apps and Policies: Edit
5. Save the token securely. You will need this later.

#### 1.3 **Create Cloudflare KV Storage Namespace**

The Worker Script will only map KV pairs found in a single KV Storage namespace. This KV namespace is bound to the Worker Script by its KV namespace ID as part of GitHub's deployment action workflow.

To create a KV namespace:
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Storage & Databases > KV**.
3. Create a KV namespace using any name you like.
4. Save the KV namespace.

#### 1.4 **Create Cloudflare KV Pair**

Each key-value pair's key is a friendly name, which maps to a value that is an Access Policy ID. The key must be usable in a URL query parameter.

To add a key-value pair:
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Storage & Databases > KV**.
3. Select the KV namespace created previously.
4. Choose the **KV Pairs** tab.
5. Enter a key and value.
6. Add the KV entry.

To locate the Zero Trust Access Policy ID for your key-value pair's value:
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Zero Trust > Access > Policies**.
3. Choose a policy from the list.
4. Copy the Policy ID.

**Important** The Policy ID must have at least 1 **include** rule of type **IP**. If there are more than 1, they will all be updated. If there are 0, the Worker Script will error out.

### 2. **GitHub Configuration**

It's assumed you already have a GitHub account and have some familiarity using it.

#### 2.1 **Fork repository**

Create a new fork of this GitHub repository.

#### 2.2 **Configure your repository's secrets**

The GitHub deployment action workflow uses Cloudflare Wrangler. There are a few environment secrets to set.
1. Navigate to **Settings > Security > Secrets and variables > Actions**.
2. Under **Repository Secrets**, click **Add repository secret** to add the following.
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID (a UUID).
   - `CLOUDFLARE_API_TOKEN`: The Cloudflare API token previously created for this GitHub deployment action.
   - `CLOUDFLARE_NAMESPACE_ID`: The Cloudflare KV Storage namespace ID previously created.

#### 2.3 **Enable GitHub Actions**

Go to your GitHub repository's Actions and enable.

If this doesn't kickoff the deployment workflow, go to **Actions > All Workflows > Deploy** and click **Run Workflow**.

#### 2.4 **Verify deployment in Cloudflare**

When the GitHub deployment workflow action completes, you can verify it's present in Cloudflare.
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Computer (Workers) > Workers & Pages**.
3. Observe the **unifi-cloudflare-ddns-access** Worker.

You can test the Worker using curl:
```sh
curl https://<worker-name>.<worker-subdomain>.workers.dev/update?ip=%i&hostname=%h \
	 -X GET
	 -H "Authorization: Bearer $(echo "anyusername:my-cloudflare-api-token-for-ddns-client" | base64 )"
```

### 3. **Configure DDNS**

The Worker Script assumes its requests are using [inadyn](https://github.com/troglobit/inadyn), which is found on UniFi OS as part of their Debian Linux installation.

The [inadyn](https://github.com/troglobit/inadyn) configuration:
- **Type:** `custom`
- **ddns-server:** `<worker-name>.<worker-subdomain>.workers.dev`
- **ddns-path:** `/update?ip=%i&hostname=%h`
- **Hostname:** The key from the Cloudflare KV Storage namespace created earlier.
- **Username:** This must be set but can be anything (e.g., `building1-udm`)
- **Password:** The DDNS client Cloudflare API Token created earlier.

#### 3.1 **UniFi OS**

1. Log in to your [UniFi OS Controller](https://unifi.ui.com/).
2. Go to **Settings > Internet > WAN > Dynamic DNS**.
3. Create New Dynamic DNS with the following information:
   - **Service:** `custom`
   - **Hostname:** The key from the Cloudflare KV Storage namespace created earlier.
   - **Username:** This must be set but can be anything (e.g., `building1-udm`)
   - **Password:** The DDNS client Cloudflare API Token created earlier.
   - **Server:** `<worker-name>.<worker-subdomain>.workers.dev/update?ip=%i&hostname=%h`
     *(Omit `https://`)*

## ⚠️ **Untested deployment automation**

The original project included a one-click deployment which can be tried and maybe improved.

**WARNING** I have not tested this but I expect it to (1) hopefully handle most of the GitHub configuration, but (2) fail when trying to bind the KV namespace. If that happens, try adding CLOUDFLARE_NAMESPACE_ID to your repository's **Settings > Security > Secrets and variables > Actions**.

#### **Option 1: Click to Deploy**
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/youshouldtellmemore/unifi-ddns-cloudflare-access)

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

## 🛠️ **Testing & Troubleshooting**

Using this script with various Ubiquiti devices and different UniFi software versions can introduce unique challenges. If you encounter issues, start by checking the FAQ in `/docs/faq.md`. If you don’t find a solution, you can ask a question on the [discussions page](https://github.com/youshouldtellmemore/unifi-ddns-cloudflare-access/discussions/new?category=q-a). If the problem persists, please raise an issue [here](https://github.com/youshouldtellmemore/unifi-ddns-cloudflare-access/issues).
