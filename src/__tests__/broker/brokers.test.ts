import { Linking } from 'react-native';
import { BROKERS, brokerById, openInBroker } from '../../broker/brokers';

describe('brokers', () => {
  it('builds quote links for US and SGX', () => {
    expect(brokerById('moomoo').quoteUrl('AAPL', 'US')).toBe('https://www.moomoo.com/stock/AAPL-US');
    expect(brokerById('moomoo').quoteUrl('D05', 'SGX')).toBe('https://www.moomoo.com/stock/D05-SG');
    expect(brokerById('tiger').quoteUrl('AAPL', 'US')).toBe('https://www.itiger.com/stock/AAPL');
    expect(brokerById('tiger').quoteUrl('D05', 'SGX')).toBe('https://www.itiger.com/stock/D05.SI');
    expect(brokerById('ibkr').quoteUrl('AAPL', 'US')).toBe('https://www.interactivebrokers.com/');
    expect(BROKERS.map((b) => b.id)).toEqual(['moomoo', 'tiger', 'ibkr']);
  });

  it('opens the link and reports success', async () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(undefined);
    await expect(openInBroker('moomoo', 'NVDA', 'US')).resolves.toBe(true);
    expect(spy).toHaveBeenCalledWith('https://www.moomoo.com/stock/NVDA-US');
  });

  it('reports failure when the link cannot open', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('no handler'));
    await expect(openInBroker('tiger', 'NVDA', 'US')).resolves.toBe(false);
  });
});
