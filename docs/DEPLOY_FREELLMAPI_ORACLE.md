# Deploy FreeLLMAPI online for free, 24/7 (Oracle Cloud + HTTPS)

This makes your AI engine live on the internet so KnowHub's AI Tutor works from
anywhere — no localhost, nothing running on your PC. It's the most involved
setup in the project, so go slowly and follow each step in order. Budget ~45–60
minutes the first time.

**What you'll end up with:** `https://YOURNAME.duckdns.org` serving FreeLLMAPI,
which you paste into KnowHub → Settings.

You will use three free services:
- **Oracle Cloud** — a free always-on Linux server (VM).
- **DuckDNS** — a free web address (so we can get HTTPS).
- **Docker + Caddy** — software on the server (Caddy gives free HTTPS automatically).

> Tip: keep a text file open to paste down values you'll reuse: the server's
> **public IP**, your **DuckDNS domain**, and your **ENCRYPTION_KEY**.

---

## Part 1 — Create an Oracle Cloud account
1. Go to **https://www.oracle.com/cloud/free/** → **Start for free**.
2. Sign up (needs an email, phone, and a card for identity verification — the
   **Always Free** resources we use are $0; you won't be charged unless you
   manually upgrade).
3. Pick a **Home Region** close to you (you can't change it later).
4. Finish signup and log in to the **Oracle Cloud Console**.

---

## Part 2 — Create the free server (VM)
1. In the Console search bar type **Instances** → open **Compute → Instances**.
2. Click **Create instance**.
3. **Name:** `knowhub-api`.
4. **Image and shape** → **Edit**:
   - **Image:** click **Change image** → choose **Canonical Ubuntu 22.04** → Select.
   - **Shape:** click **Change shape** → **Ampere (ARM)** → `VM.Standard.A1.Flex`
     (1 OCPU, 6 GB) is great and Always Free. *If it says "out of capacity,"*
     switch to **Specialty and previous generation → `VM.Standard.E2.1.Micro`**
     (Always Free, x86, 1 GB) — that one is almost always available.
5. **Networking:** leave the defaults (it creates a virtual network for you).
   Make sure **"Assign a public IPv4 address"** is **Yes**.
6. **Add SSH keys:** choose **Generate a key pair for me** → click **Save private
   key** (and **Save public key**). Keep the downloaded `.key` file safe — it's
   how you log in. (On Windows it usually lands in your Downloads folder.)
7. Click **Create**. Wait ~1 minute until the instance is **Running**.
8. Copy the **Public IP address** shown on the instance page. Save it.

---

## Part 3 — Open the firewall ports in Oracle (80 and 443)
Oracle blocks everything except SSH by default. Open the web ports:
1. On the instance page, under **Primary VNIC**, click the **Subnet** link.
2. Click the **Security List** (usually "Default Security List for …").
3. Click **Add Ingress Rules** and add **two** rules:
   - Rule 1 → **Source CIDR:** `0.0.0.0/0`, **IP Protocol:** TCP,
     **Destination Port Range:** `80`
   - Rule 2 → **Source CIDR:** `0.0.0.0/0`, **IP Protocol:** TCP,
     **Destination Port Range:** `443`
4. **Add Ingress Rules** to save.

---

## Part 4 — Connect to the server (SSH)
On your Windows PC, open a terminal (VSCode **Terminal → New Terminal**, or
PowerShell). Replace the key path and IP with yours:

```powershell
ssh -i "C:\Users\you\Downloads\ssh-key-XXXX.key" ubuntu@YOUR_PUBLIC_IP
```

- If it warns about key permissions being too open, run this once, then retry:
  ```powershell
  icacls "C:\Users\you\Downloads\ssh-key-XXXX.key" /inheritance:r /grant:r "$($env:USERNAME):(R)"
  ```
- Type **yes** if asked to trust the host. You're now "inside" the server when the
  prompt looks like `ubuntu@knowhub-api:~$`.

---

## Part 5 — Open the OS firewall + install Docker (run these on the server)
Copy–paste these one block at a time into the SSH session.

Open ports 80/443 in Ubuntu's firewall and make it permanent:
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

Install Docker (the official one-line installer) and enable your user to use it:
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```
Now **log out and back in** so the group change applies:
```bash
exit
```
…then SSH in again (Part 4 command). Verify Docker works:
```bash
docker run --rm hello-world
```
You should see "Hello from Docker!".

---

## Part 6 — Get the deployment files onto the server
```bash
git clone https://github.com/knowhub-by-ab/knowhub.git
cd knowhub/infrastructure/freellmapi
```

---

## Part 7 — Get a free web address (DuckDNS)
1. In your browser go to **https://www.duckdns.org** → sign in (Google/GitHub).
2. In the **sub domain** box type something unique, e.g. `knowhub-ai-api`, → **add domain**.
   Your address is now `knowhub-ai-api.duckdns.org`.
3. In that row, set the **current ip** box to your server's **Public IP** (Part 2) → **update ip**.
4. (Optional) note your **token** at the top — only needed if you later automate IP updates.

---

## Part 8 — Configure and start FreeLLMAPI (on the server)
Create your settings file from the example:
```bash
cp .env.example .env
```
Generate an encryption key and view it:
```bash
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
```
Now edit `.env`:
```bash
nano .env
```
Set the three values (use the key you just generated):
```env
DOMAIN=knowhub-ai-api.duckdns.org
ENCRYPTION_KEY=paste-the-64-character-key-here
DASHBOARD_ORIGINS=https://knowhub-ai.pages.dev,http://localhost:5173
```
Save in nano: **Ctrl+O**, **Enter**, then **Ctrl+X**.

Start everything:
```bash
docker compose up -d
```
Watch it get its HTTPS certificate (takes 10–60 seconds):
```bash
docker compose logs -f caddy
```
When you see lines about a certificate being obtained for your domain, press
**Ctrl+C** to stop watching (the servers keep running).

---

## Part 9 — First login + provider keys
1. In your browser open **https://knowhub-ai-api.duckdns.org** (your DuckDNS domain).
   - The padlock should show; if the browser warns about the certificate, wait a
     minute and refresh (Caddy may still be issuing it).
2. Create the FreeLLMAPI admin account (email + password) when prompted.
3. Go to the **Keys** page, add at least one free provider key (e.g. Google
   Gemini or Groq — see that page's links), and reorder the fallback chain.
4. Copy the **unified key** (`freellmapi-…`) from the Keys page header.

---

## Part 10 — Point KnowHub at your online AI
1. Open **https://knowhub-ai.pages.dev** → **Settings**.
2. Set:
   - **Endpoint base URL:** `https://knowhub-ai-api.duckdns.org/v1`
   - **API key:** the `freellmapi-…` unified key
   - **Model:** `auto`
3. **Save**, open **AI Tutor**, and ask something. It now works from anywhere —
   phone, another laptop — with nothing running on your PC. 🎉

---

## Keeping it running
- The server and containers restart automatically (Oracle reboots, crashes, etc.)
  because of `restart: unless-stopped`.
- To update FreeLLMAPI later: `cd ~/knowhub/infrastructure/freellmapi && docker compose pull && docker compose up -d`.
- Your data (provider keys) lives in a Docker volume and survives restarts/updates.

## Troubleshooting
- **Browser can't reach the domain:** re-check Part 3 (Oracle ingress 80/443) and
  Part 5 (iptables). Both must be open.
- **Certificate errors that don't clear:** make sure DuckDNS points at the correct
  public IP (Part 7) and port 80 is open (Caddy needs it to verify the cert).
- **AI Tutor says CORS/blocked:** confirm `DASHBOARD_ORIGINS` in `.env` includes
  `https://knowhub-ai.pages.dev`, then `docker compose up -d` again.
- **Oracle ARM "out of capacity":** use the `E2.1.Micro` shape (Part 2, step 4).
- **See logs:** `docker compose logs -f freellmapi` or `... caddy`.
