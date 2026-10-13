import { router } from 'expo-router';
import SearchView, { addFromResult } from '../../components/SearchView';
import { addBook } from '../../tracker';

const open = (id: string) => router.push({ pathname: '/title/[id]', params: { id } });

export default function Search() {
  return (
    <SearchView
      onPick={(r) => open(addFromResult(r).id)}
      manual={(title) => open(addBook({ title, authors: [] }).id)}
    />
  );
}
