const jwt = require("jsonwebtoken");
const createError = require("http-errors");
const { auth } = require("../config");
const { User, RefreshToken } = require("../db/sequelize");
const { sha256 } = require("../utils/crypto");

function signAccess(user) {
  return jwt.sign(
    { sub: user.id, plan: user.plan, role: user.role },
    auth.jwtSecret,
    { expiresIn: auth.jwtExpiresIn }
  );
}

function signRefresh(user) {
  return jwt.sign({ sub: user.id }, auth.refreshSecret, {
    expiresIn: auth.refreshExpiresIn,
  });
}

async function authenticate(req, _res, next) {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    if (!token) throw createError(401, "Missing Authorization header");
    const payload = jwt.verify(token, auth.jwtSecret);
    const user = await User.findByPk(payload.sub);
    if (!user) throw createError(401, "Invalid token");
    req.user = user;
    next();
  } catch (e) {
    next(createError(401, "Unauthorized"));
  }
}

async function rotateRefresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw createError(400, "refreshToken required");
    const payload = jwt.verify(refreshToken, auth.refreshSecret);
    const tokenHash = sha256(refreshToken);
    const row = await RefreshToken.findOne({
      where: { user_id: payload.sub, token_hash: tokenHash, revoked: false },
    });
    if (!row) throw createError(401, "Invalid refresh token");
    const user = await User.findByPk(payload.sub);
    const access = signAccess(user);
    const newRefresh = signRefresh(user);
    // revoke old & store new
    row.revoked = true;
    await row.save();
    await RefreshToken.create({
      user_id: user.id,
      tokenHash: sha256(newRefresh),
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });
    res.json({ accessToken: access, refreshToken: newRefresh });
  } catch (e) {
    next(createError(401, "Invalid refresh token"));
  }
}

module.exports = { signAccess, signRefresh, authenticate, rotateRefresh };
