import http from 'k6/http';
import { sleep, check } from 'k6';

export default function () {
  const url = 'http://localhost:8080/api/payment/create-order';
  const payload = JSON.stringify({
    orderId: '65d7a9b1e4b0a1a2b3c4d5f1'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + __ENV.AUTH_TOKEN
    }
  };

  const res = http.post(url, payload, params);
  check(res, {
    'status is 200 or 409 or 401': (r) => [200, 409, 401].includes(r.status)
  });
  sleep(1);
}
