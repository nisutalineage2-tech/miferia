const nodemailer = require('nodemailer');

function sendOrderNotification(store, order, cartItems) {
  if (!store.smtp_host || !store.smtp_user || !store.smtp_pass) {
    console.log('SMTP not configured for store', store.id);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: store.smtp_host,
    port: parseInt(store.smtp_port || 587),
    secure: parseInt(store.smtp_port || 587) === 465,
    auth: { user: store.smtp_user, pass: store.smtp_pass },
  });

  const itemsHtml = cartItems.map(item =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${item.quantity}x ${item.name}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">$${(item.price * item.quantity).toFixed(2)}</td></tr>`
  ).join('');

  const mailOptions = {
    from: `"${store.smtp_from_name || store.name}" <${store.smtp_from_email || store.smtp_user}>`,
    to: store.smtp_from_email || store.smtp_user,
    subject: `Nuevo pedido #${order.id.slice(0, 8)} - ${store.name}`,
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif">
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;font-size:20px">Nuevo Pedido</h1>
          <p style="margin:4px 0 0;opacity:.9">${store.name}</p>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;padding:24px">
          <p style="color:#374151;margin:0 0 16px"><strong>Cliente:</strong> ${order.customer_name} ${order.customer_lastname || ''}</p>
          <p style="color:#374151;margin:0 0 4px"><strong>Email:</strong> ${order.customer_email}</p>
          ${order.customer_phone ? `<p style="color:#374151;margin:0 0 4px"><strong>Teléfono:</strong> ${order.customer_phone}</p>` : ''}
          ${order.notes ? `<p style="color:#374151;margin:0 0 16px"><strong>Notas:</strong> ${order.notes}</p>` : ''}
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead><tr style="background:#f9fafb"><th style="padding:8px 12px;text-align:left;font-size:14px">Producto</th><th style="padding:8px 12px;text-align:right;font-size:14px">Subtotal</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="border-top:2px solid #4f46e5;padding-top:12px;text-align:right;font-size:18px;font-weight:bold;color:#4f46e5">
            Total: $${order.total.toFixed(2)}
          </div>
        </div>
      </div>
    `,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error('Email send error:', err.message);
    else console.log('Order notification email sent:', info.messageId);
  });
}

module.exports = { sendOrderNotification };
