# Frequently Asked Questions

This FAQ addresses common issues and solutions for configuring UniFi devices to update Cloudflare DNS records using DDNS, based on discussions from [issues](https://github.com/willswire/unifi-ddns-cloudflare-access/issues/) and [discussions](https://github.com/willswire/unifi-ddns-cloudflare-access/discussions).

## 1. What is the correct server configuration for UniFi devices when using Cloudflare DDNS?

The server configuration depends on your UniFi device model:

- **Older Gateways (e.g., USG, USG Pro):**
  - **Server:** `unifi-cloudflare-ddns.<your_worker_subdomain>.workers.dev`
  - **Note:** Do **not** include the path with variables.

- **Newer Gateways (e.g., UDM series, UXG series):**
  - **Server:** `unifi-cloudflare-ddns.<your_worker_subdomain>.workers.dev/update?ip=%i&hostname=%h`
  - **Note:** Include the full path with variables.

This distinction is crucial to ensure the DDNS updates function correctly.

## 2. How do I configure DDNS on my UniFi device?

1. **Access UniFi Controller:**
   - Navigate to **Settings** > **Internet** > **WAN** > **Dynamic DNS**.

2. **Create New Dynamic DNS Entry:**
   - **Service:** `custom`
   - **Hostname:** A key from your Cloudflare KV store *(`mykey` or `home`)*
   - **Username:** This must be set but can be anything (e.g., `building1-udm`)
   - **Password:** Cloudflare User API Token for Worker Script *(not an Account API Token)*
   - **Server:** `<worker-name>.<worker-subdomain>.workers.dev/update?ip=%i&hostname=%h`
     *(Omit `https://`)*

3. **Save Configuration:**
   - Click **Save** to apply the settings.

## 3. How should I format the server field when configuring DDNS on my UniFi device?

Remove `https://` from the **Server** field before inputting the server address.

## 4. What should I do if I encounter the error: "Failed to find zone '%h/nic/update?system=dyndns'"?

This error typically occurs due to incorrect server configuration. Ensure that:

- For **older gateways**, the server field contains only the FQDN without the path.
- For **newer gateways**, the server field includes the full path with variables.

Double-check your device model and adjust the server configuration accordingly.

## 5. How can I verify if my DDNS configuration is working correctly?

For **UDM-Pro** devices:

1. **SSH into your UDM-Pro:**
   - Use an SSH client to access your device.

2. **Run the following command:**
   ```bash
   ps aux | grep inadyn
   inadyn -n -1 --force -f /run/ddns-eth4-inadyn.conf
   ```

3. **Check Logs:**
   - Review `/var/log/messages` for any errors or confirmation messages indicating successful updates.

For **USG** devices:

1. **SSH into your USG:**
   - Use an SSH client to access your device.

2. **Run the following command:**
   ```bash
   sudo ddclient -daemon=0 -verbose -noquiet -debug -file /etc/ddclient/ddclient_eth0.conf
   ```

3. **Check Output:**
   - Look for `SUCCESS` messages indicating that the DDNS update was successful.

## 6. What permissions are required for the Cloudflare API token used in DDNS configuration?

The User API token should have the following permissions:

- **Account:**
  - **Access: Apps and Policies: Edit**
  - **Workers KV Storage: Read**

## 7. How frequently does the UniFi device update the DDNS record?

UniFi devices typically check for IP changes and update DDNS records approximately every two minutes.

## 8. How can I configure DDNS for dual WAN setups on my UniFi device?

In dual WAN configurations, UniFi devices may not natively support configuring DDNS for both WAN interfaces simultaneously. To manage DDNS updates for both connections **use different DDNS providers**.

Assign separate DDNS providers to each WAN interface if supported. Using the `custom` DDNS provider for one WAN connection and `dyndns` for the other is recommended.

Each DDNS configuration should use a different key-value pair from the KV store. The Worker Script updates ALL IPs in the specified Access Policy's include rules.

## 9. What should I do if I continue to experience issues with DDNS updates?

- **Verify Configuration:**
  - Double-check all entries in your DDNS settings for accuracy.

- **Check Logs:**
  - Review system logs on your UniFi device for error messages.

- **Seek Community Assistance:**
  - Engage with the community by posting issues or questions on relevant GitHub repositories or forums.
