param (
    [string]$OutputFile = "lines_of_code.txt",
    [string[]]$Include = @("*.js", "*.html")
)

function Get-FunctionCount {
    param(
        [string[]]$scriptContent
    )

    $count = 0
    # Heurystyka do zliczania funkcji: 'function', '=>', 'class method'
    $patterns = @(
        'function\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*\{', # Standardowa funkcja: function name() {
        '\s*=\s*\([^)]*\)\s*=>',                     # Funkcja strzałkowa: () =>
        '\s*=\s*async\s*\([^)]*\)\s*=>',              # Asynchroniczna funkcja strzałkowa: async () =>
        '^\s*(async\s+)?(?!(if|for|while|switch|catch|constructor)\b)([a-zA-Z_][a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{' # Metoda w klasie: myMethod() {
    )

    foreach ($line in $scriptContent) {
        foreach ($pattern in $patterns) {
            if ($line -match $pattern) {
                $count++
                break # Przejdź do następnej linii po znalezieniu dopasowania
            }
        }
    }

    return $count
}

function Get-ClassCount {
    param(
        [string[]]$scriptContent
    )

    $count = 0
    $pattern = 'class\s+[a-zA-Z0-9_]+\s*\{' # Prosty wzorzec: class MyClass {

    foreach ($line in $scriptContent) {
        if ($line -match $pattern) {
            $count++
        }
    }

    return $count
}

# Jeśli skrypt jest uruchamiany z ISE lub innego hosta, gdzie $PSScriptRoot nie jest zdefiniowane,
# upewniamy się, że działa on w swoim własnym katalogu.
if ($PSScriptRoot) {
    Set-Location $PSScriptRoot
}

$totalLines = 0
$totalFunctions = 0
$totalClasses = 0
$report = @()
$report += "Line, Function, and Class Count Report for $($Include -join ', ')"
$report += "Generated on: $(Get-Date)"
$report += "-----------------------------------------------------------------------------------"
$report += "{0,-50} | {1,10} | {2,10} | {3,10}" -f "File", "Lines", "Functions", "Classes"
$report += "-----------------------------------------------------------------------------------"


# Pobierz pliki i sformatuj dane wyjściowe
Get-ChildItem -Path . -Recurse -Include $Include | ForEach-Object {
    $file = $_
    try {
        $content = Get-Content -Path $file.FullName
        $lineCount = $content.Length
        $relativePath = $file.FullName.Substring((Get-Location).Path.Length + 1)
        
        $functionCount = 0
        $classCount = 0
        if ($file.Extension -eq '.js') {
            $functionCount = Get-FunctionCount -scriptContent $content
            $classCount = Get-ClassCount -scriptContent $content
        }
        elseif ($file.Extension -eq '.html') {
            $rawContent = Get-Content -Path $file.FullName -Raw
            # Używamy lookbehind, aby upewnić się, że tag script nie jest typu text/template
            $scriptBlocks = ([regex]::Matches($rawContent, '(?s)(?<!type=["'']text/template["''])<script.*?>\s*(.*?)\s*</script>')).Groups[1].Value
            foreach ($scriptBlock in $scriptBlocks) {
                if ($scriptBlock.Trim().Length -gt 0) {
                     $scriptLines = ($scriptBlock -split '\r?\n')
                     $functionCount += Get-FunctionCount -scriptContent $scriptLines
                     $classCount += Get-ClassCount -scriptContent $scriptLines
                }
            }
        }

        $report += "{0,-50} | {1,10} | {2,10} | {3,10}" -f $relativePath, $lineCount, $functionCount, $classCount
        $totalLines += $lineCount
        $totalFunctions += $functionCount
        $totalClasses += $classCount
    }
    catch {
        $report += "ERROR processing $($file.FullName): $($_.Exception.Message)"
    }
}

$report += "-----------------------------------------------------------------------------------"
$report += "{0,-50} | {1,10} | {2,10} | {3,10}" -f "TOTAL", $totalLines, $totalFunctions, $totalClasses

$report | Out-File -FilePath $OutputFile -Encoding utf8

Write-Host "Line and function count report saved to '$OutputFile'" 