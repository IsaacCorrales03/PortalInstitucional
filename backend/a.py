def resolver():
    entrada = input().strip()
    partes = entrada.split()
    secuencia_str = partes[-1]

    arr = [int(digito) for digito in secuencia_str]
    n = len(arr)

    if n == 0:
        print(0)
        return

    dp = [[float('inf')] * 3 for _ in range(n)]
    for j in range(3):
        dp[0][j] = j

    for i in range(1, n):
        for j in range(3):
            v_actual = arr[i] + j
            for k in range(3):
                v_previo = arr[i - 1] + k
                if abs(v_actual - v_previo) != 1:
                    dp[i][j] = min(dp[i][j], dp[i - 1][k] + j)
    print(dp)
    print(min(dp[n - 1]))

resolver()