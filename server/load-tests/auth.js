import http from 'k6/http';
import { sleep, check } from 'k6';

export default function () {
  const url = 'http://localhost:8080/api/auth/send-email-otp';
  const payload = JSON.stringify({
    email: `load_test_${__VU}_${__ITER}@example.com`
  });

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const res = http.post(url, payload, params);
  check(res, {
    'status is 200 or 400 or 429': (r) => [200, 400, 429].includes(r.status)
  });
  sleep(1);
}
