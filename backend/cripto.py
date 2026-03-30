import bcrypt

password = "administrador"

# Convertir a bytes
password_bytes = password.encode('utf-8')

# Generar salt
salt = bcrypt.gensalt()

# Crear hash
hashed = bcrypt.hashpw(password_bytes, salt)

# Imprimir
print("Hash:", hashed.decode())