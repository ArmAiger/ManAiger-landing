const fetch = require("node-fetch");
const { twitch: twitchConfig } = require("../config");
const { decrypt, encrypt } = require("../utils/crypto");
const { TwitchChannel } = require("../db/sequelize");

const getAuthUrl = (state) => {
  const scopes = [
    "user:read:email",
    "analytics:read:games",
    "channel:read:stream_key",
    "chat:read",
    "clips:edit",
  ];

  const url =
    `https://id.twitch.tv/oauth2/authorize` +
    `?client_id=${twitchConfig.clientId}` +
    `&redirect_uri=${encodeURIComponent(twitchConfig.redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes.join(" "))}` +
    `&state=${state}`;

  return url;
};

const getTokens = async (code) => {
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: twitchConfig.clientId,
      client_secret: twitchConfig.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: twitchConfig.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to get tokens from Twitch");
  }

  return response.json();
};

const getUser = async (accessToken) => {
  const response = await fetch("https://api.twitch.tv/helix/users", {
    headers: {
      "Client-ID": twitchConfig.clientId,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get user from Twitch");
  }

  const data = await response.json();
  return data.data[0];
};

const refreshToken = async (channel) => {
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: decrypt(channel.refreshToken),
      client_id: twitchConfig.clientId,
      client_secret: twitchConfig.clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token from Twitch");
  }

  const tokens = await response.json();

  await channel.update({
    accessToken: encrypt(tokens.access_token),
    refreshToken: encrypt(tokens.refresh_token),
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
  });

  return tokens.access_token;
};

const getChannelStats = async (userId) => {
  const channel = await TwitchChannel.findOne({ where: { user_id: userId } });

  if (!channel || !channel.access_token) {
    throw new Error("No Twitch access token found for this user.");
  }

  let accessToken = decrypt(channel.access_token);

  if (new Date() > new Date(channel.token_expires_at)) {
    accessToken = await refreshToken(channel);
  }

  const [userResponse, streamResponse] = await Promise.all([
    fetch(`https://api.twitch.tv/helix/users?id=${channel.channel_id}`, {
      headers: {
        "Client-ID": twitchConfig.clientId,
        Authorization: `Bearer ${accessToken}`,
      },
    }),
    fetch(`https://api.twitch.tv/helix/streams?user_id=${channel.channel_id}`, {
      headers: {
        "Client-ID": twitchConfig.clientId,
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  ]);

  if (!userResponse.ok || !streamResponse.ok) {
    const userError = await userResponse.text();
    const streamError = await streamResponse.text();
    console.error('Twitch API error:', { userError, streamError });
    throw new Error(`Failed to get channel stats from Twitch: ${userError} | ${streamError}`);
  }

  const userData = await userResponse.json();
  const streamData = await streamResponse.json();

  // Example: return basic channel info and stream info
  return {
    channel: userData.data[0], // includes id, login, display_name, description, etc.
    stream: streamData.data[0] || null, // null if not live
  };
};

module.exports = {
  getAuthUrl,
  getTokens,
  getUser,
  refreshToken,
  getChannelStats,
};
