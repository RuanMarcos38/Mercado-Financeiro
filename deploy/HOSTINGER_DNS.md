# Hostinger DNS — mercadoia.rrestrategiaperformance.com.br

Create an A record in the DNS zone of rrestrategiaperformance.com.br:

- Type: A
- Name/Host: mercadoia
- Points to: <IP_PUBLICO_DO_SERVIDOR_EASYPANEL>
- TTL: default/automatic

Remove any conflicting A/AAAA/CNAME record for the same host before adding the final record.

After DNS propagation:
1. Add mercadoia.rrestrategiaperformance.com.br in EasyPanel > App > Domains.
2. Enable HTTPS.
3. Verify:
   - /
   - /api/health
   - /forex
   - /integracoes
   - /autotrade

Do not point the subdomain to Hostinger web hosting if the application is running inside EasyPanel; Hostinger is only managing DNS in this setup.
