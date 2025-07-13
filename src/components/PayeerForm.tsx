import { useMemo } from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import { sha256 } from 'js-sha256';

const PayeerForm = () => {
  const m_shop = '2240994389';
  const m_orderid = 'tempid302001';
  const m_amount = '12.50';
  const m_curr = 'USD';
  const secret_key = 'SECRET_KEY';
  const m_desc_raw = 'Оплата шаблона';

  const encodeBase64 = (str: string) => {
    return Buffer.from(str, 'utf-8').toString('base64');
  };

  const m_desc = encodeBase64(m_desc_raw);

  const success_url = 'https://rtm-web-app2.vercel.app/success';
  const fail_url = 'https://rtm-web-app2.vercel.app/fail';
  const status_url = 'https://payeer-status-server-production.up.railway.app/payeer-status'; // заменить на твой сервер

  const m_sign = useMemo(() => {
    const baseString = `${m_shop}:${m_orderid}:${m_amount}:${m_curr}:${m_desc}:${secret_key}`;
    return sha256(baseString).toUpperCase();
  }, [m_shop, m_orderid, m_amount, m_curr, m_desc, secret_key]);

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h5" align="center" gutterBottom>
        Оплата через Payeer
      </Typography>

      <form method="POST" action="https://payeer.com/merchant/">
        <input type="hidden" name="m_shop" value={m_shop} />
        <input type="hidden" name="m_orderid" value={m_orderid} />
        <input type="hidden" name="m_amount" value={m_amount} />
        <input type="hidden" name="m_curr" value={m_curr} />
        <input type="hidden" name="m_desc" value={m_desc} />
        <input type="hidden" name="m_sign" value={m_sign} />
        <input type="hidden" name="success_url" value={success_url} />
        <input type="hidden" name="fail_url" value={fail_url} />
        <input type="hidden" name="status_url" value={status_url} />

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
