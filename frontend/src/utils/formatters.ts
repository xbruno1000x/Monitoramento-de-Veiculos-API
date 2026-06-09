const velocidadeFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatarVelocidade(valor: number | null | undefined) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return 'N/A'
  }

  return `${velocidadeFormatter.format(valor)} km/h`
}