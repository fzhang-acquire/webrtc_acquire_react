### Guide
https://gist.github.com/cecilemuller/9492b848eb8fe46d462abeb26656c4f8


### Install on system

https://gist.github.com/cecilemuller/9492b848eb8fe46d462abeb26656c4f8#trust-the-local-ca




openssl req -x509 -nodes -new -sha256 -days 5024 -newkey rsa:2048 -keyout AcquireCA.key -out AcquireCA.pem -subj "/C=US/CN=Acquire-Local-CA"
openssl x509 -outform pem -in AcquireCA.pem -out AcquireCA.crt

openssl req -new -nodes -newkey rsa:2048 -keyout acquire.key -out acquire.csr -subj "/C=US/ST=State/L=City/O=Acquire-Local-Certificates/CN=acquire.local"
openssl x509 -req -sha256 -days 5024 -in acquire.csr -CA AcquireCA.pem -CAkey AcquireCA.key -CAcreateserial -extfile domains.ext -out acquire.crt
