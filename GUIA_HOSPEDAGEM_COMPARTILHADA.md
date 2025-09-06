# GUIA HOSPEDAGEM COMPARTILHADA - VALE CASHBACK

## PASSO 1: PREPARAR ARQUIVOS PARA UPLOAD

### 1.1 Criar estrutura PHP
```
valecashback/
├── public_html/
│   ├── index.php
│   ├── api/
│   │   ├── auth.php
│   │   ├── client.php
│   │   ├── merchant.php
│   │   └── admin.php
│   ├── assets/
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   ├── includes/
│   │   ├── config.php
│   │   ├── database.php
│   │   └── functions.php
│   └── admin/
├── .htaccess
└── config.php
```

### 1.2 Converter frontend para HTML/CSS/JS
1. Fazer build do React: `npm run build`
2. Copiar arquivos do `dist/` para `public_html/assets/`
3. Criar `index.php` principal

## PASSO 2: CRIAR BANCO MYSQL

### 2.1 No painel hPanel da Hostinger:
1. Vá em "Banco de Dados MySQL"
2. Clique "Criar novo banco"
3. Nome: `u123456_valecashback`
4. Criar usuário: `u123456_valeuser`
5. Senha forte: anote a senha
6. Dar todas as permissões

### 2.2 Executar SQL no phpMyAdmin:
```sql
-- Tabela de usuários
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    type ENUM('client', 'merchant', 'admin') NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    photo TEXT,
    referral_code VARCHAR(50),
    referred_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de comerciantes
CREATE TABLE merchants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    logo TEXT,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabela de saldos
CREATE TABLE cashbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    balance DECIMAL(10,2) DEFAULT 0.00,
    total_earned DECIMAL(10,2) DEFAULT 0.00,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabela de transações
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    merchant_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    cashback_amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    payment_method VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- Tabela de transferências
CREATE TABLE transfers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
);

-- Tabela de QR Codes
CREATE TABLE qr_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10,2),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    expires_at TIMESTAMP NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Inserir usuários padrão
INSERT INTO users (name, email, password, type, referral_code) VALUES
('Administrador', 'admin@valecashback.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'ADMIN001'),
('Cliente Demo', 'cliente@valecashback.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client', 'CLIENT001'),
('Lojista Demo', 'lojista@valecashback.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'merchant', 'MERCHANT001');

-- Inserir comerciante demo
INSERT INTO merchants (user_id, store_name, category, approved) VALUES
((SELECT id FROM users WHERE email = 'lojista@valecashback.com'), 'Loja Demo', 'Variedades', TRUE);

-- Inserir saldos iniciais
INSERT INTO cashbacks (user_id, balance, total_earned) VALUES
((SELECT id FROM users WHERE email = 'admin@valecashback.com'), 1000.00, 1000.00),
((SELECT id FROM users WHERE email = 'cliente@valecashback.com'), 500.00, 500.00),
((SELECT id FROM users WHERE email = 'lojista@valecashback.com'), 200.00, 200.00);
```

## PASSO 3: CRIAR ARQUIVOS PHP

### 3.1 Criar config.php
```php
<?php
// config.php
define('DB_HOST', 'localhost');
define('DB_NAME', 'u123456_valecashback'); // Substitua pelo seu banco
define('DB_USER', 'u123456_valeuser');      // Substitua pelo seu usuário
define('DB_PASS', 'SUA_SENHA_AQUI');       // Substitua pela sua senha

define('SITE_URL', 'https://seudominio.com.br');
define('SITE_NAME', 'Vale Cashback');

// Configurações de sessão
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 1);

session_start();
?>
```

### 3.2 Criar includes/database.php
```php
<?php
// includes/database.php
require_once 'config.php';

class Database {
    private $connection;
    
    public function __construct() {
        try {
            $this->connection = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch(PDOException $e) {
            die("Erro de conexão: " . $e->getMessage());
        }
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    public function query($sql, $params = []) {
        $stmt = $this->connection->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }
    
    public function fetch($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetch();
    }
    
    public function fetchAll($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetchAll();
    }
}

$db = new Database();
?>
```

### 3.3 Criar includes/functions.php
```php
<?php
// includes/functions.php

function authenticate($email, $password) {
    global $db;
    
    $user = $db->fetch(
        "SELECT * FROM users WHERE email = ? AND status = 'active'",
        [$email]
    );
    
    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_type'] = $user['type'];
        $_SESSION['user_name'] = $user['name'];
        return $user;
    }
    
    return false;
}

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function requireAuth() {
    if (!isLoggedIn()) {
        header('HTTP/1.1 401 Unauthorized');
        echo json_encode(['error' => 'Não autenticado']);
        exit;
    }
}

function requireRole($role) {
    requireAuth();
    if ($_SESSION['user_type'] !== $role) {
        header('HTTP/1.1 403 Forbidden');
        echo json_encode(['error' => 'Acesso negado']);
        exit;
    }
}

function getUserBalance($user_id) {
    global $db;
    
    $result = $db->fetch(
        "SELECT balance FROM cashbacks WHERE user_id = ?",
        [$user_id]
    );
    
    return $result ? $result['balance'] : 0;
}

function updateBalance($user_id, $amount, $operation = 'add') {
    global $db;
    
    $operator = ($operation === 'add') ? '+' : '-';
    
    $db->query(
        "UPDATE cashbacks SET balance = balance $operator ?, updated_at = NOW() WHERE user_id = ?",
        [$amount, $user_id]
    );
}

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
?>
```

### 3.4 Criar api/auth.php
```php
<?php
// api/auth.php
require_once '../includes/database.php';
require_once '../includes/functions.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['PATH_INFO'] ?? '';

if ($method === 'POST' && $path === '/login') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    
    $user = authenticate($email, $password);
    
    if ($user) {
        jsonResponse([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'type' => $user['type']
            ]
        ]);
    } else {
        jsonResponse(['error' => 'Credenciais inválidas'], 401);
    }
}

if ($method === 'GET' && $path === '/me') {
    if (isLoggedIn()) {
        $user = $db->fetch(
            "SELECT id, name, email, type FROM users WHERE id = ?",
            [$_SESSION['user_id']]
        );
        jsonResponse(['user' => $user]);
    } else {
        jsonResponse(['error' => 'Não autenticado'], 401);
    }
}

if ($method === 'POST' && $path === '/logout') {
    session_destroy();
    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Endpoint não encontrado'], 404);
?>
```

### 3.5 Criar api/client.php
```php
<?php
// api/client.php
require_once '../includes/database.php';
require_once '../includes/functions.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

requireRole('client');

$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['PATH_INFO'] ?? '';

// Dashboard do cliente
if ($method === 'GET' && $path === '/dashboard') {
    $user_id = $_SESSION['user_id'];
    
    $balance = getUserBalance($user_id);
    
    $transactions = $db->fetchAll(
        "SELECT t.*, m.store_name 
         FROM transactions t 
         JOIN merchants m ON t.merchant_id = m.id 
         WHERE t.user_id = ? 
         ORDER BY t.created_at DESC 
         LIMIT 10",
        [$user_id]
    );
    
    jsonResponse([
        'balance' => $balance,
        'transactions' => $transactions
    ]);
}

// Transferências
if ($method === 'POST' && $path === '/transfer') {
    $input = json_decode(file_get_contents('php://input'), true);
    $to_user_id = $input['to_user_id'];
    $amount = $input['amount'];
    $description = $input['description'] ?? '';
    
    $from_user_id = $_SESSION['user_id'];
    $current_balance = getUserBalance($from_user_id);
    
    if ($current_balance < $amount) {
        jsonResponse(['error' => 'Saldo insuficiente'], 400);
    }
    
    // Processar transferência
    $db->query("START TRANSACTION");
    
    try {
        // Debitar do remetente
        updateBalance($from_user_id, $amount, 'subtract');
        
        // Creditar ao destinatário
        updateBalance($to_user_id, $amount, 'add');
        
        // Registrar transferência
        $db->query(
            "INSERT INTO transfers (from_user_id, to_user_id, amount, description) VALUES (?, ?, ?, ?)",
            [$from_user_id, $to_user_id, $amount, $description]
        );
        
        $db->query("COMMIT");
        
        jsonResponse(['success' => true]);
        
    } catch (Exception $e) {
        $db->query("ROLLBACK");
        jsonResponse(['error' => 'Erro ao processar transferência'], 500);
    }
}

// Buscar usuários para transferência
if ($method === 'GET' && $path === '/search-users') {
    $search = $_GET['search'] ?? '';
    $method_type = $_GET['method'] ?? 'email';
    
    if (strlen($search) < 3) {
        jsonResponse([]);
    }
    
    $field = ($method_type === 'email') ? 'email' : 'phone';
    
    $users = $db->fetchAll(
        "SELECT id, name, email, phone FROM users 
         WHERE $field LIKE ? AND type = 'client' AND id != ? 
         LIMIT 5",
        ["%$search%", $_SESSION['user_id']]
    );
    
    jsonResponse($users);
}

jsonResponse(['error' => 'Endpoint não encontrado'], 404);
?>
```

## PASSO 4: CRIAR index.php PRINCIPAL

### 4.1 Criar public_html/index.php
```php
<?php
require_once 'config.php';
require_once 'includes/database.php';
require_once 'includes/functions.php';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vale Cashback - Sistema de Cashback</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body>
    <div id="app">
        <!-- Conteúdo será carregado via JavaScript -->
    </div>
    
    <script src="assets/js/app.js"></script>
</body>
</html>
```

## PASSO 5: CRIAR .htaccess

### 5.1 Criar .htaccess na raiz
```apache
RewriteEngine On

# Redirecionar para HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# API Routes
RewriteRule ^api/auth/(.*)$ api/auth.php/$1 [L,QSA]
RewriteRule ^api/client/(.*)$ api/client.php/$1 [L,QSA]
RewriteRule ^api/merchant/(.*)$ api/merchant.php/$1 [L,QSA]
RewriteRule ^api/admin/(.*)$ api/admin.php/$1 [L,QSA]

# Frontend Routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [L,QSA]

# Security Headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"

# Cache static files
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 month"
</FilesMatch>
```

## PASSO 6: UPLOAD DOS ARQUIVOS

### 6.1 Via Gerenciador de Arquivos (hPanel):
1. Acesse hPanel → "Gerenciador de Arquivos"
2. Vá para pasta `public_html`
3. Faça upload de todos os arquivos PHP
4. Organize nas pastas corretas

### 6.2 Via FTP/FileZilla:
```
Host: ftp.seudominio.com.br
Usuário: seu_usuario_ftp
Senha: sua_senha_ftp
Porta: 21
```

## PASSO 7: CONFIGURAR DOMÍNIO

### 7.1 No hPanel:
1. Vá em "Domínios"
2. Aponte o domínio para a pasta `public_html`
3. Configure SSL gratuito

### 7.2 Testar acesso:
- https://seudominio.com.br
- https://seudominio.com.br/api/auth/me

## PASSO 8: CREDENCIAIS DE TESTE

Após o upload, teste com:
- **Admin**: admin@valecashback.com / secret
- **Cliente**: cliente@valecashback.com / secret  
- **Lojista**: lojista@valecashback.com / secret

## PASSO 9: MONITORAMENTO

### 9.1 Logs de erro:
- Via hPanel → "Logs de Erro"
- Arquivo: `error_log` na pasta principal

### 9.2 Backup automático:
- Configure no hPanel
- Download semanal do banco

## OBSERVAÇÕES IMPORTANTES

1. **Senhas**: As senhas padrão são "secret" - ALTERE imediatamente
2. **Database**: Substitua `u123456_` pelos dados reais do seu banco
3. **SSL**: Configure certificado gratuito no hPanel
4. **Logs**: Monitore logs de erro regularmente
5. **Backup**: Faça backup do banco semanalmente

## ESTRUTURA FINAL NA HOSPEDAGEM

```
public_html/
├── index.php
├── config.php
├── .htaccess
├── api/
│   ├── auth.php
│   ├── client.php
│   ├── merchant.php
│   └── admin.php
├── includes/
│   ├── database.php
│   └── functions.php
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
└── admin/
```

**Resultado**: https://seudominio.com.br funcionando em hospedagem compartilhada!