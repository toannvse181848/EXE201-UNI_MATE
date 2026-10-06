import { useCallback, useEffect, useState } from 'react';
import { venueApi } from '../api/venueApi';
import { voucherApi } from '../api/voucherApi';
import { groupVouchersByVenue, toVenueCard } from '../utils/venueMapper';

/** Danh sách quán đã duyệt kèm voucher đang chạy của từng quán */
export function useVenues() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [venuesRes, vouchersRes] = await Promise.allSettled([
        venueApi.getVenues(),
        voucherApi.getVouchers(),
      ]);
      if (venuesRes.status === 'rejected') throw venuesRes.reason;

      const voucherByVenue = groupVouchersByVenue(
        vouchersRes.status === 'fulfilled' ? vouchersRes.value.data?.data : []
      );
      const list = venuesRes.value.data?.data || [];
      setVenues(list.map((v) => toVenueCard(v, voucherByVenue[v._id])));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { venues, loading, error, reload: load };
}
