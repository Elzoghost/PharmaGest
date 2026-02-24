// ═══════════════════════════════════════════════════════
// SUPABASE EDGE FUNCTION — relance-trial
// Fichier : supabase/functions/relance-trial/index.ts
// Déploiement : supabase functions deploy relance-trial
// Cron : tous les jours à 9h (configurer dans Supabase Dashboard)
// ═══════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RESEND_KEY   = Deno.env.get("RESEND_API_KEY")!
const ADMIN_TEL    = Deno.env.get("ADMIN_WA_TEL") || "221770000000"
const APP_URL      = Deno.env.get("APP_URL") || "https://pharmagest.netlify.app"

const PRIX: Record<string, number> = {
  Starter: 15000,
  Professionnel: 29000,
  Entreprise: 55000,
}

serve(async (req) => {
  // Vérifier auth (optionnel — cron Supabase envoie un JWT)
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const now = new Date()
  const in7  = new Date(now.getTime() + 7  * 864e5).toISOString()
  const in3  = new Date(now.getTime() + 3  * 864e5).toISOString()
  const in1  = new Date(now.getTime() + 1  * 864e5).toISOString()
  const past = new Date(now.getTime() - 1  * 864e5).toISOString() // expiré hier

  // Récupérer les pharmacies en essai
  const { data: pharmacies, error } = await supabase
    .from("pharmacies")
    .select("*")
    .eq("statut", "trial")
    .not("email", "is", null)

  if (error) {
    console.error("Supabase error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const results = { sent: 0, expired: 0, errors: 0 }

  for (const ph of pharmacies || []) {
    const trialEnd = new Date(ph.trial_end)
    const jours = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Pharmacie expirée → marquer comme expired
    if (jours < 0) {
      await supabase
        .from("pharmacies")
        .update({ statut: "expired" })
        .eq("id", ph.id)
      results.expired++
      // Envoyer email expiration
      await sendEmail(ph, RESEND_KEY, "expired", 0, ADMIN_TEL, APP_URL, PRIX)
      continue
    }

    // Relances à J-7, J-3, J-1
    if ([7, 3, 1].includes(jours)) {
      const ok = await sendEmail(ph, RESEND_KEY, "trial", jours, ADMIN_TEL, APP_URL, PRIX)
      if (ok) results.sent++
      else results.errors++
    }
  }

  console.log(`Relances: ${JSON.stringify(results)}`)
  return new Response(JSON.stringify({ ok: true, ...results, ts: now.toISOString() }), {
    headers: { "Content-Type": "application/json" },
  })
})

async function sendEmail(
  ph: any, resendKey: string, type: "trial"|"expired",
  jours: number, adminTel: string, appUrl: string, prix: Record<string,number>
): Promise<boolean> {
  if (!resendKey || !ph.email) return false
  const p = prix[ph.plan] || 29000
  const subjectMap = {
    trial: `⏳ Votre essai PharmaGest expire dans ${jours} jour${jours>1?"s":""}`,
    expired: "❌ Votre essai PharmaGest a expiré — Renouvelez maintenant",
  }
  const bodyMap = {
    trial: `Votre essai gratuit de <strong>${ph.nom}</strong> expire dans <strong>${jours} jour${jours>1?"s":""}</strong>.<br><br>
      Renouvelez maintenant pour continuer sans interruption.<br><br>
      <strong>Plan ${ph.plan} : ${p.toLocaleString("fr-FR")} FCFA/mois</strong>`,
    expired: `Votre essai gratuit de <strong>${ph.nom}</strong> a expiré.<br><br>
      Réactivez votre compte dès maintenant pour retrouver toutes vos données.<br><br>
      <strong>Plan ${ph.plan} : ${p.toLocaleString("fr-FR")} FCFA/mois</strong>`,
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer "+resendKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "PharmaGest <noreply@pharmagest.sn>",
        to: ph.email,
        subject: subjectMap[type],
        html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#FAF7F2;padding:20px">
          <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">
            <div style="background:${type==="trial"?"linear-gradient(135deg,#C9A84C,#E8C56A)":"linear-gradient(135deg,#C0392B,#E74C3C)"};padding:24px;text-align:center">
              <h1 style="color:${type==="trial"?"#0B3D2E":"#fff"};font-size:1.2rem;margin:0">${subjectMap[type]}</h1>
            </div>
            <div style="padding:24px">
              <p>Bonjour <strong>${ph.contact||ph.nom}</strong>,</p>
              <p>${bodyMap[type]}</p>
              <a href="https://wa.me/${adminTel}?text=Renouvellement ${encodeURIComponent(ph.nom)} - ${ph.id}"
                 style="display:block;background:#0B3D2E;color:#fff;padding:13px;border-radius:9px;text-align:center;text-decoration:none;font-weight:700;margin:18px 0">
                💳 Renouveler mon abonnement
              </a>
              <p style="font-size:.8rem;color:#6B8C7E">Paiement Wave ou Orange Money · Support : <a href="https://wa.me/${adminTel}">WhatsApp</a></p>
            </div>
            <div style="background:#0B3D2E;color:#fff;padding:14px;text-align:center;font-size:.75rem;opacity:.8">
              © 2026 PharmaGest 🇸🇳
            </div>
          </div>
        </body></html>`,
      }),
    })
    return r.ok
  } catch (e) {
    console.error("Resend error:", e)
    return false
  }
}
