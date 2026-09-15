// The category list (`GET/POST /admin/categories`), and the real one:
// `/client` reads this same collection through `GET /categories`, so a
// category added here shows up in the students' browse filters, listing
// form and home sidebar. It used to write to a collection nothing on the
// student side read.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

import adminApi from '../../services/adminApi';
import apiErrorMessage from '../../utils/apiError';
import AdminNavbar from '../../components/layout/AdminNavbar';
import Panel from '../../components/ui/Panel';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';

const slugify = (s) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export default function CategoryManager() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', icon: '' });
  const [error, setError] = useState('');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminApi.get('/admin/categories').then((r) => r.data.data.categories),
  });

  const create = useMutation({
    mutationFn: (payload) => adminApi.post('/admin/categories', payload),
    onSuccess: () => {
      toast.success('Category created.');
      setForm({ name: '', icon: '' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not create that category.')),
  });

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (form.name.trim().length < 2) return setError('Name is too short.');
    create.mutate({
      name: form.name.trim(),
      slug: slugify(form.name),
      icon: form.icon.trim(),
      // One past the highest, not the count — they are not the same once
      // anything has ever been deleted or reordered, and a duplicate order
      // makes the student-facing list sort arbitrarily.
      order: Math.max(0, ...(categories || []).map((c) => c.order ?? 0)) + 1,
    });
  };

  return (
    <>
      <AdminNavbar title="Categories" blurb={`${categories?.length ?? 0} in the database.`} />

      <div className="grid grid-cols-1 gap-5 p-6 lg:grid-cols-[1fr_320px]">
        <div className="border-[3px] border-ink bg-paper-3">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border-b-2 border-ink/10 p-3">
                <Skeleton className="h-8" />
              </div>
            ))}

          {!isLoading && !categories?.length && (
            <div className="px-4 py-14 text-center">
              <p className="text-[13px] font-extrabold text-ink">No categories yet.</p>
            </div>
          )}

          {categories?.map((c) => (
            <div
              key={c._id}
              className="flex items-center gap-3 border-b-2 border-ink/10 px-4 py-3 text-[13px] font-semibold text-ink last:border-b-0"
            >
              <span className="text-[18px]">{c.icon || '📦'}</span>
              <span className="flex-1 font-extrabold">{c.name}</span>
              <span className="font-mono text-[11px] text-steel">{c.slug}</span>
              {!c.isActive && <Badge tone="outline">Inactive</Badge>}
            </div>
          ))}
        </div>

        <Panel>
          <span className="caption caption--tl">Add one</span>
          <form onSubmit={submit} className="mt-5 flex flex-col gap-3.5">
            <Input
              label="Name"
              placeholder="Musical instruments"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Icon (optional emoji)"
              placeholder="🎸"
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
            />
            {form.name.trim() && <p className="meta">Slug: {slugify(form.name)}</p>}
            {error && <p className="text-[11.5px] font-bold leading-snug text-crimson">{error}</p>}
            <Button variant="primary" size="lg" loading={create.isPending} className="w-full">
              <Plus className="h-4 w-4" strokeWidth={3} /> Create category
            </Button>
          </form>
        </Panel>
      </div>
    </>
  );
}
