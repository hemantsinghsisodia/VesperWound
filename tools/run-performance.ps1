$ErrorActionPreference = 'Stop'

# Keep this Windows workstation awake only for the measurement. This does not
# edit a power plan, and the execution-state request ends with this process.
Add-Type -TypeDefinition @'
using System.Runtime.InteropServices;
public static class VesperBenchmarkPower {
    [DllImport("kernel32.dll")]
    public static extern uint SetThreadExecutionState(uint flags);
}
'@

$previousOptIn = $env:VESPER_PERFORMANCE
$powerRequest = [VesperBenchmarkPower]::SetThreadExecutionState([uint32]2147483651)
if ($powerRequest -eq 0) { throw 'Could not request temporary protection from idle sleep.' }
try {
    $env:VESPER_PERFORMANCE = '1'
    npm run test:performance
    if ($LASTEXITCODE -ne 0) { throw "Performance test failed with exit code $LASTEXITCODE." }
}
finally {
    $env:VESPER_PERFORMANCE = $previousOptIn
    [void][VesperBenchmarkPower]::SetThreadExecutionState([uint32]2147483648)
}
