import { router, useLocalSearchParams } from 'expo-router';
import SearchView from '../components/SearchView';
import { patchBook } from '../tracker';

export default function Find() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SearchView
      onPick={(r) => {
        patchBook(id, { title: r.title, authors: r.authors, year: r.year, pages: r.pages, coverId: r.coverId, olKey: r.olKey });
        router.back();
      }}
    />
  );
}
