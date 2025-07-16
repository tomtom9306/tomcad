param (
    [string]$OutputFile = "tomcad_snapshot.txt",
    [string[]]$Include = @("*.js", "*.html", "*.css", "*.ps1"),
    [string[]]$Exclude = @("node_modules\*")
)

# Jeśli skrypt jest uruchamiany z ISE lub innego hosta, gdzie $PSScriptRoot nie jest zdefiniowane,
# upewniamy się, że działa on w swoim własnym katalogu.
if ($PSScriptRoot) {
    Set-Location $PSScriptRoot
}

# Wyczyść plik wyjściowy, jeśli istnieje
if (Test-Path $OutputFile) {
    Clear-Content $OutputFile
}

$report = "Codebase Snapshot for tomcad"
$report += "`nGenerated on: $(Get-Date)"
$report | Out-File -FilePath $OutputFile -Encoding utf8

# Pobierz pliki i sformatuj dane wyjściowe
Get-ChildItem -Path . -Recurse -Include $Include -Exclude $Exclude | ForEach-Object {
    $file = $_
    try {
        $relativePath = $file.FullName.Substring((Get-Location).Path.Length + 1)
        $content = Get-Content -Path $file.FullName -Raw

        $fileHeader = @"

================================================================================
File: $relativePath
================================================================================

"@
        
        Add-Content -Path $OutputFile -Value $fileHeader
        Add-Content -Path $OutputFile -Value $content
    }
    catch {
        $errorMessage = "ERROR processing $($file.FullName): $($_.Exception.Message)"
        Add-Content -Path $OutputFile -Value $errorMessage
    }
}

$footer = "`n================================================================================`nEnd of Snapshot`n================================================================================`n"
Add-Content -Path $OutputFile -Value $footer

Write-Host "Codebase snapshot saved to '$OutputFile'" 