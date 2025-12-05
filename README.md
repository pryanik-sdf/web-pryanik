# WebUtility

Web-утилита для Ubuntu Linux, аналог Webmin, с функциями управления установленных модулей и консольным доступом. Доступ только через авторизацию под учетной записью root.

## Функционал

- Авторизация через системную учетную запись root
- Просмотр списка установленных модулей (пакетов)
- Удаление модулей
- Доступ к консоли через веб-интерфейс

## Требования

- Ubuntu Linux (или другой дистрибутив с apt)
- Node.js >= 14
- Приложение должно запускаться под root пользователем

## Установка и запуск

1. Склонируйте репозиторий и запустите инсталляцию:
   ```
   git clone https://github.com/pryanik-sdf/web-pryanik.git
   cd webutility
   sudo ./install.sh
   ```

Это установит зависимости, настроит SSL, systemd сервис и запустит приложение автоматически на https://localhost.

Теперь установлена глобальная команда `pryanikweb -v` для показа версии.

### Альтернативно: ручная установка

Если не хотите автоматическую установку:

2. Установите зависимости:
   ```
   npm install
   ```

3. Установите как глобальную команду (опционально):
   ```
   npm link
   ```
   Теперь команда `pryanikweb -v` покажет версию.

4. Настройте systemd для автозапуска:
   - Скопируйте `pryanikweb.service` в `/etc/systemd/system/`:
     ```
     sudo cp pryanikweb.service /etc/systemd/system/
     ```
   - Отредактируйте файл, заменив `/path/to/webutility` на абсолютный путь к проекту.
   - Добавьте Environment для SSL.
   - Выполните:
     ```
     sudo systemctl daemon-reload
     sudo systemctl enable pryanikweb
     sudo systemctl start pryanikweb
     ```

5. Откройте браузер по адресу https://localhost

6. Также можно запустить вручную как root:
   ```
   sudo node index.js
   ```

## Безопасность

- Доступ заблокирован без авторизации
- Только аутентификация под root
- Приложение работает исключительно под root для выполнения критических операций

## Конфигурация

- Порт сервера: 3000 (без SSL), 443 (с SSL)
- Секрет сессии: измените 'webmin-clone-secret' в index.js

## SSL Поддержка

Для включения HTTPS, установите переменные окружения `SSL_KEY` и `SSL_CERT`:

```
export SSL_KEY=/path/to/private_key.pem
export SSL_CERT=/path/to/certificate.pem
```

Сервер будет слушать на порту 443.

Для самоподписанного сертификата:

```
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/webutility.key -out /etc/ssl/certs/webutility.crt
sudo chown root:root /etc/ssl/private/webutility.key /etc/ssl/certs/webutility.crt
sudo chmod 600 /etc/ssl/private/webutility.key
sudo chmod 644 /etc/ssl/certs/webutility.crt
```

Затем добавьте в systemd service:

```
Environment=SSL_KEY=/etc/ssl/private/webutility.key SSL_CERT=/etc/ssl/certs/webutility.crt
```

И измените порт на 443 в файл прyanikweb.service.

## Лицензия

ISC
