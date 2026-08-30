import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import type { Court } from '@/services/CourtService';
import CourtAddressService, { ADDRESS_UNAVAILABLE } from '@/services/CourtAddressService';

type Props = {
  court: Court;
  style?: TextStyle;
};

/**
 * Displays a readable street address under a court name.
 * Resolves asynchronously after the court is already loaded — never blocks court/map loading.
 */
export default function CourtAddressText({ court, style }: Props) {
  const cached = CourtAddressService.getCachedAddress(court.id);
  const [display, setDisplay] = useState<string>(
    cached ??
      (CourtAddressService.hasReadableAddress(court)
        ? court.address!
        : 'Finding address…')
  );

  useEffect(() => {
    let cancelled = false;

    const immediate = CourtAddressService.getCachedAddress(court.id);
    if (immediate) {
      setDisplay(immediate);
      return;
    }

    if (CourtAddressService.hasReadableAddress(court)) {
      setDisplay(court.address!);
    } else {
      setDisplay('Finding address…');
    }

    CourtAddressService.resolveAddress(court).then((address) => {
      if (!cancelled) {
        setDisplay(address);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [court.id, court.address, court.latitude, court.longitude]);

  const isMuted =
    display === 'Finding address…' || display === ADDRESS_UNAVAILABLE;

  return (
    <Text
      style={[styles.address, isMuted && styles.muted, style]}
      numberOfLines={2}
    >
      {display}
    </Text>
  );
}

const styles = StyleSheet.create({
  address: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  muted: {
    color: '#888',
    fontStyle: 'italic',
  },
});
