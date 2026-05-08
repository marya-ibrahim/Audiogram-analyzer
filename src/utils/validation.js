export const validateLogin = ({ identifier, password, isRegister, name }) => {
  if (isRegister && !name?.trim()) return "Name required";
  if (!identifier?.trim()) return "Identifier required";
  if (!password) return "Password required";
  if (isRegister && password.length < 6) return "Password too short";
  return null;
};