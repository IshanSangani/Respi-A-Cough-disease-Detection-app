export type ModelKey = 'rf' | 'logreg' | 'mlp' | 'svm' | 'resnet';

export function normalizeModelKey(input?: string | null): ModelKey | null {
  if (!input) return null;
  const v = String(input).trim().toLowerCase();
  if (!v) return null;

  if (v === 'rf' || v.includes('randomforest')) return 'rf';
  if (v === 'logreg' || v.includes('logisticregression')) return 'logreg';
  if (v === 'mlp' || v.includes('mlp')) return 'mlp';
  if (v === 'svm' || v === 'svc' || v.includes('supportvectormachine')) return 'svm';
  if (v === 'resnet' || v.includes('resnet')) return 'resnet';

  return null;
}

export function modelLabel(model?: string | null): string {
  const key = normalizeModelKey(model);
  switch (key) {
    case 'rf':
      return 'Random Forest';
    case 'logreg':
      return 'Logistic Regression';
    case 'mlp':
      return 'Multi-layer Perceptron';
    case 'svm':
      return 'Support Vector Machine';
    case 'resnet':
      return 'ResNet (Spectrogram CNN)';
    default:
      // If we don't recognize it, return the raw string so the user still sees something.
      return model ? String(model) : '';
  }
}
