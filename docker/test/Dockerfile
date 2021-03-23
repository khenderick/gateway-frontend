FROM jenkins/jnlp-agent-docker as jnlp

FROM node:11.9.0

RUN apt update

RUN apt install default-jdk -y

COPY --from=jnlp /usr/local/bin/jenkins-agent /usr/local/bin/jenkins-agent
COPY --from=jnlp /usr/share/jenkins/agent.jar /usr/share/jenkins/agent.jar

ENTRYPOINT ["/usr/local/bin/jenkins-agent"]

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm install

RUN npm install jest jest-junit

ENV PATH="/app/node_modules/.bin:${PATH}"
