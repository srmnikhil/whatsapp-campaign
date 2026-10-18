import { describeError } from '../lib/errors.js';
import { Alert } from './ui/Alert.jsx';

export function ErrorAlert({ error, title }) {
  const described = describeError(error);
  return <Alert tone="error" title={title ?? described.title}>{described.message}</Alert>;
}
