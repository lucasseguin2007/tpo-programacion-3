param(
    [string]$Uri = 'bolt://localhost:7687',
    [string]$User = 'neo4j'
)
$ErrorActionPreference = 'Stop'
$previousUri = $env:NEO4J_URI
$previousUser = $env:NEO4J_USER
$previousPassword = $env:NEO4J_PASSWORD
$securePassword = Read-Host 'Contraseña de Neo4j (no se guarda)' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $env:NEO4J_URI = $Uri
    $env:NEO4J_USER = $User
    $env:NEO4J_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    Push-Location (Split-Path -Parent $PSScriptRoot)
    try { & .\mvnw.cmd spring-boot:run } finally { Pop-Location }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    $securePassword.Dispose()
    $env:NEO4J_URI = $previousUri
    $env:NEO4J_USER = $previousUser
    $env:NEO4J_PASSWORD = $previousPassword
}
