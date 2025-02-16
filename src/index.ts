import { ClientOptions, Cloudflare, KVNamespace } from 'cloudflare';

class HttpError extends Error {
	constructor(
		public statusCode: number,
		message: string,
	) {
		super(message);
		this.name = 'HttpError';
	}
}

function constructClientOptions(request: Request): ClientOptions {
	const authorization = request.headers.get('Authorization');
	if (!authorization) {
		throw new HttpError(401, 'API token missing.');
	}

	const [, data] = authorization.split(' ');
	const decoded = atob(data);
	const index = decoded.indexOf(':');

	if (index === -1 || /[\0-\x1F\x7F]/.test(decoded)) {
		throw new HttpError(401, 'Invalid API key or token.');
	}

	return {
		apiToken: decoded.substring(index + 1)
	};
}

function constructIPPolicy(request: Request): IPPolicy {
	const url = new URL(request.url);
	const params = url.searchParams;
	const ip = params.get('ip');
	const policyKey = params.get('hostname');

	if (ip === null || ip === undefined) {
		throw new HttpError(422, 'The "ip" parameter is required and cannot be empty.');
	}

	if (policyKey === null || policyKey === undefined) {
		throw new HttpError(422, 'The "hostname" parameter is required and cannot be empty.');
	}

	return {
		ip: ip,
		policyIdAlias: policyKey
	};
}

async function update(accountId: string, kvNamespaceId: any, clientOptions: ClientOptions, newPolicy: IPPolicy): Promise<Response> {
	const cloudflare = new Cloudflare(clientOptions);

	const tokenStatus = (await cloudflare.user.tokens.verify()).status;
	if (tokenStatus !== 'active') {
		throw new HttpError(401, 'This API Token is ' + tokenStatus);
	}

	// Get policy noted by hostname input.
	const policyUUID = await kvNamespaceId.get(newPolicy.policyIdAlias);

	// Fetch existing policy
	const policies = (
		await cloudflare.zeroTrust.access.policies.list({
			id: policyUUID,
			account_id: accountId
		})
	).result;
	if (policies.length === 0) {
		throw new HttpError(400, 'No policies found! You must first manually create the policy.');
	}
	const policy = policies[0];

	// Identify first include.ip rule and update to match new IP.
	let updated = false;
	const policyInclude = policy.include.map((rule: any) => {
		let newRule = rule;
		if (!updated && rule.ip) {
			rule.ip.ip = newPolicy.ip;
			updated = true;
		}
		return rule;
	});

	// Send updated policy
	const updateResponse = await cloudflare.zeroTrust.access.policies.update(
		policyUUID,
		{
			account_id: accountId,
			name: policy.name,
			decision: policy.decision,
			include: policyInclude,
		}
	);

	console.log('Policy ' + policy.name + '\'s IPRange include rule successfully to ' + newPolicy.ip + '.');

	return new Response('OK', { status: 200 });
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		console.log('Requester IP: ' + request.headers.get('CF-Connecting-IP'));
		console.log('CF Ray ID: ' + request.headers.get('CF-Ray'));
		console.log('User Agent: ' + request.headers.get('User-Agent'));
		console.log('Referer: ' + request.headers.get('Referer'));
		console.log(request.method + ': ' + request.url);
		console.log('Body: ' + (await request.text()));

		try {
			// Construct client options and IP policy
			const clientOptions = constructClientOptions(request);
			const policy = constructIPPolicy(request);

			// Run the update function
			const accountId = env.CLOUDFLARE_ACCOUNT_ID;
			const kvNamespaceId = env.unifi_cloudflare_ddns_access_kv;
			return await update(accountId, kvNamespaceId, clientOptions, policy);
		} catch (error) {
			if (error instanceof HttpError) {
				console.log('Error updating policy: ' + error.message);
				return new Response(error.message, { status: error.statusCode });
			} else {
				console.log('Error updating policy: ' + error);
				return new Response('Internal Server Error', { status: 500 });
			}
		}
	},
} satisfies ExportedHandler<Env>;
