import http from 'k6/http';
import { sleep, check } from 'k6';

export default function () {
  const url = 'http://localhost:8080/api/user/orders';
  const payload = JSON.stringify({
    addressId: '65d7a9b1e4b0a1a2b3c4d5f1',
    paymentMethod: 'COD'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + __ENV.AUTH_TOKEN
    }
  };

  const res = http.post(url, payload, params);
  check(res, {
    'status is 200 or 401': (r) => [200, 401].includes(r.status)
  });
  sleep(1);
}
