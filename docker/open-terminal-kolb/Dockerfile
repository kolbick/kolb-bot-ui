FROM ghcr.io/open-webui/open-terminal:latest

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssh-server \
    && mkdir -p /run/sshd \
    && ssh-keygen -A \
    && printf '%s\n' \
        'PasswordAuthentication no' \
        'KbdInteractiveAuthentication no' \
        'PubkeyAuthentication yes' \
        'AuthorizedKeysFile .ssh/authorized_keys' \
        'PermitRootLogin no' \
        > /etc/ssh/sshd_config.d/kolb-bot.conf \
    && rm -rf /var/lib/apt/lists/*

RUN usermod --badname -l Kolb-Bot user \
    && groupmod --new-name Kolb-Bot user \
    && usermod -d /home/Kolb-Bot -m Kolb-Bot \
    && ln -s /home/Kolb-Bot /home/user \
    && sed -i \
        -e 's#/home/user#/home/Kolb-Bot#g' \
        -e 's/\<user:user\>/Kolb-Bot:Kolb-Bot/g' \
        -e 's/echo "user"/echo "Kolb-Bot"/g' \
        -e 's/!= "user"/!= "Kolb-Bot"/g' \
        -e 's/usermod -aG "\$SOCK_GROUP" user/usermod -aG "\$SOCK_GROUP" Kolb-Bot/g' \
        /app/entrypoint.sh

COPY start-hermes-gateway.sh /usr/local/bin/start-hermes-gateway.sh
COPY start-kolb-terminal.sh /usr/local/bin/start-kolb-terminal.sh
RUN chmod +x /usr/local/bin/start-hermes-gateway.sh /usr/local/bin/start-kolb-terminal.sh

ENV HOME=/home/Kolb-Bot
ENV PATH=/home/Kolb-Bot/.local/bin:${PATH}

WORKDIR /home/Kolb-Bot
USER root

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/start-kolb-terminal.sh"]
