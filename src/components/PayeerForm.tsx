import { useMemo, useState } from 'react';
import { Container, Typography, Button, Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import sha256 from 'js-sha256';

const PayeerForm = () => {
  const m_shop = '2240994389';
  const secret_key = 'SECRET_KEY';
  const m_orderid = 'tempid302001';
  const m_desc_raw = 'Оплата шаблона';

  const [currency, setCurrency] = useState<'USD' | 'RUB'>('USD');

  const m_amount = currency === 'USD' ? '12.50' : '1000.00';
  const m_curr = currency;

  const encodeBase64 = (str: string) => {
    return btoa(unescape(encodeURIComponent(str)));
  };

  const m_desc = encodeBase64(m_desc_raw);

  const m_sign = useMemo(() => {
    const baseString = `${m_shop}:${m_orderid}:${m_amount}:${m_curr}:${m_desc}:${secret_key}`;
    return sha256.sha256(baseString).toUpperCase();
  }, [m_shop, m_orderid, m_amount, m_curr, m_desc, secret_key]);

  const handleCurrencyChange = (_: any, newCurrency: 'USD' | 'RUB' | null) => {
    if (newCurrency !== null) {
      setCurrency(newCurrency);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h5" align="center" gutterBottom>
        Оплата через Payeer
      </Typography>

      <Box display="flex" justifyContent="center" mt={2}>
        <ToggleButtonGroup
          color="primary"
          value={currency}
          exclusive
          onChange={handleCurrencyChange}
          aria-label="Выбор валюты"
        >
          <ToggleButton value="USD">USD – $12.50</ToggleButton>
          <ToggleButton value="RUB">RUB – ₽1000</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <form method="POST" action="https://payeer.com/merchant/">
        <input type="hidden" name="m_shop" value={m_shop} />
        <input type="hidden" name="m_orderid" value={m_orderid} />
        <input type="hidden" name="m_amount" value={m_amount} />
        <input type="hidden" name="m_curr" value={m_curr} />
        <input type="hidden" name="m_desc" value={m_desc} />
        <input type="hidden" name="m_sign" value={m_sign} />
        <input type="hidden" name="success_url" value="https://rtm-web-app2.vercel.app/success" />
        <input type="hidden" name="fail_url" value="https://rtm-web-app2.vercel.app/fail" />
        <input type="hidden" name="status_url" value="https://payeer-status-server-production.up.railway.app/payeer-status" />

        <Box mt={4} display="flex" justifyContent="center">
          <Button variant="contained" color="primary" type="submit">
            Перейти к оплате
          </Button>
        </Box>
      </form>
    </Container>
  );
};

export default PayeerForm;

