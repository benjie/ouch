# Global args, set before the first FROM, shared by all stages
ARG NODE_ENV="production"
ARG GRAPHILE_ENV="production"

################################################################################
# Build stage 1 - `yarn build`

FROM node:24-alpine AS builder
# Import our shared args
ARG NODE_ENV
ARG GRAPHILE_ENV

# Cache node_modules for as long as possible
COPY .yarn/ /app/.yarn/
COPY .yarnrc.yml package.json yarn.lock tsconfig.json /app/
WORKDIR /app/
RUN ["corepack", "enable"]
RUN ["yarn", "install", "--immutable"]

# Copy over the server source code
COPY src/ /app/src/

# Finally run the build script
RUN ["yarn", "run", "build"]

################################################################################
# Build stage 2 - COPY the relevant things (multiple steps)

FROM node:24-alpine AS clean
# Import our shared args
ARG NODE_ENV
ARG GRAPHILE_ENV

# Copy over selectively just the tings we need, try and avoid the rest
COPY --from=builder /app/.yarnrc.yml /app/package.json /app/yarn.lock /app/
COPY --from=builder /app/.yarn/releases/ /app/.yarn/releases/
COPY --from=builder /app/dist/ /app/dist/

################################################################################
# Build stage FINAL - COPY everything, once, and then do a clean `yarn install`

FROM node:24-alpine
# Import our shared args
ARG NODE_ENV
ARG GRAPHILE_ENV

EXPOSE 5678
WORKDIR /app/
# Copy everything from stage 2, it's already been filtered
COPY --from=clean /app/ /app/

# Install yarn ASAP because it's the slowest
RUN ["corepack", "enable"]
RUN ["yarn", "workspaces", "focus", "-A", "--production"]

LABEL description="My PostGraphile-powered server"

ENV HOST="0.0.0.0"
ENV NODE_ENV=$NODE_ENV
ENV GRAPHILE_ENV=$GRAPHILE_ENV
ENTRYPOINT ["yarn", "start:production"]
