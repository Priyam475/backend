package com.mercotrace.config;

import java.net.URI;
import java.util.concurrent.TimeUnit;
import javax.cache.configuration.MutableConfiguration;
import javax.cache.expiry.CreatedExpiryPolicy;
import javax.cache.expiry.Duration;
import org.hibernate.cache.jcache.ConfigSettings;
import org.redisson.Redisson;
import org.redisson.config.ClusterServersConfig;
import org.redisson.config.Config;
import org.redisson.config.SingleServerConfig;
import org.redisson.jcache.configuration.RedissonConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.cache.JCacheManagerCustomizer;
import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.boot.info.BuildProperties;
import org.springframework.boot.info.GitProperties;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.context.annotation.*;
import com.mercotrace.service.TraderContextService;
import com.mercotrace.service.dto.WeighingSessionCreateRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tech.jhipster.config.JHipsterProperties;
import tech.jhipster.config.cache.PrefixedKeyGenerator;

@Configuration
@EnableCaching
public class CacheConfiguration {

    private GitProperties gitProperties;
    private BuildProperties buildProperties;

    @Autowired(required = false)
    private TraderContextService traderContextService;

    @Bean
    public javax.cache.configuration.Configuration<Object, Object> jcacheConfiguration(JHipsterProperties jHipsterProperties) {
        MutableConfiguration<Object, Object> jcacheConfig = new MutableConfiguration<>();

        URI redisUri = URI.create(jHipsterProperties.getCache().getRedis().getServer()[0]);

        Config config = new Config();
        // Fix Hibernate lazy initialization https://github.com/jhipster/generator-jhipster/issues/22889
        config.setCodec(new org.redisson.codec.SerializationCodec());
        if (jHipsterProperties.getCache().getRedis().isCluster()) {
            ClusterServersConfig clusterServersConfig = config
                .useClusterServers()
                .setMasterConnectionPoolSize(jHipsterProperties.getCache().getRedis().getConnectionPoolSize())
                .setMasterConnectionMinimumIdleSize(jHipsterProperties.getCache().getRedis().getConnectionMinimumIdleSize())
                .setSubscriptionConnectionPoolSize(jHipsterProperties.getCache().getRedis().getSubscriptionConnectionPoolSize())
                .addNodeAddress(jHipsterProperties.getCache().getRedis().getServer());

            if (redisUri.getUserInfo() != null) {
                clusterServersConfig.setPassword(redisUri.getUserInfo().substring(redisUri.getUserInfo().indexOf(':') + 1));
            }
        } else {
            SingleServerConfig singleServerConfig = config
                .useSingleServer()
                .setConnectionPoolSize(jHipsterProperties.getCache().getRedis().getConnectionPoolSize())
                .setConnectionMinimumIdleSize(jHipsterProperties.getCache().getRedis().getConnectionMinimumIdleSize())
                .setSubscriptionConnectionPoolSize(jHipsterProperties.getCache().getRedis().getSubscriptionConnectionPoolSize())
                .setAddress(jHipsterProperties.getCache().getRedis().getServer()[0]);

            if (redisUri.getUserInfo() != null) {
                singleServerConfig.setPassword(redisUri.getUserInfo().substring(redisUri.getUserInfo().indexOf(':') + 1));
            }
        }
        jcacheConfig.setStatisticsEnabled(true);
        jcacheConfig.setExpiryPolicyFactory(
            CreatedExpiryPolicy.factoryOf(new Duration(TimeUnit.SECONDS, jHipsterProperties.getCache().getRedis().getExpiration()))
        );
        return RedissonConfiguration.fromInstance(Redisson.create(config), jcacheConfig);
    }

    @Bean
    public HibernatePropertiesCustomizer hibernatePropertiesCustomizer(javax.cache.CacheManager cm) {
        return hibernateProperties -> hibernateProperties.put(ConfigSettings.CACHE_MANAGER, cm);
    }

    @Bean
    public JCacheManagerCustomizer cacheManagerCustomizer(javax.cache.configuration.Configuration<Object, Object> jcacheConfiguration) {
        return cm -> {
            createCache(cm, com.mercotrace.repository.UserRepository.USERS_BY_LOGIN_CACHE, jcacheConfiguration);
            createCache(cm, com.mercotrace.repository.UserRepository.USERS_BY_EMAIL_CACHE, jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.User.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.Authority.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.User.class.getName() + ".authorities", jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.Trader.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.Role.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.Role.class.getName() + ".permissions", jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.Permission.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.Permission.class.getName() + ".roles", jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.BusinessCategory.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.Contact.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.Commodity.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.CommodityConfig.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.DeductionRule.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.HamaliSlab.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.DynamicCharge.class.getName(), jcacheConfiguration);
            // Arrivals & logistics aggregate
            createCache(cm, com.mercotrace.domain.Vehicle.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.VehicleWeight.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.SellerInVehicle.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.Lot.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.FreightCalculation.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.FreightDistribution.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.Voucher.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.DailySerial.class.getName(), jcacheConfiguration);
            // Auction module (Sales Pad)
            createCache(cm, com.mercotrace.domain.Auction.class.getName(), jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.AuctionEntry.class.getName(), jcacheConfiguration);
            // Weighing: entity L2 cache + by-bid lookup (TTL from Redis config)
            createCache(cm, com.mercotrace.domain.WeighingSession.class.getName(), jcacheConfiguration);
            createCache(cm, "weighingSessionByBid", jcacheConfiguration);
            createCache(cm, com.mercotrace.domain.PrintLog.class.getName(), jcacheConfiguration);
            // Self-Sale module
            createCache(cm, com.mercotrace.domain.SelfSaleClosure.class.getName(), jcacheConfiguration);
            // jhipster-needle-redis-add-entry
        };
    }

    private void createCache(
        javax.cache.CacheManager cm,
        String cacheName,
        javax.cache.configuration.Configuration<Object, Object> jcacheConfiguration
    ) {
        javax.cache.Cache<Object, Object> cache = cm.getCache(cacheName);
        if (cache != null) {
            cache.clear();
        } else {
            cm.createCache(cacheName, jcacheConfiguration);
        }
    }

    @Autowired(required = false)
    public void setGitProperties(GitProperties gitProperties) {
        this.gitProperties = gitProperties;
    }

    @Autowired(required = false)
    public void setBuildProperties(BuildProperties buildProperties) {
        this.buildProperties = buildProperties;
    }

    @Bean
    public KeyGenerator keyGenerator() {
        return new PrefixedKeyGenerator(this.gitProperties, this.buildProperties);
    }

    /**
     * Key generator for weighingSessionByBid cache: key = "traderId::bidNumber".
     * Used by getByBidNumber (param: Integer) and by cache eviction on create (param: WeighingSessionCreateRequest).
     */
    @Bean(name = "weighingByBidKeyGenerator")
    public KeyGenerator weighingByBidKeyGenerator() {
        return (target, method, params) -> {
            if (traderContextService == null) return "default::" + (params.length > 0 ? params[0] : "");
            Long traderId = traderContextService.getCurrentTraderId();
            Integer bidNumber = null;
            if (params.length > 0) {
                if (params[0] instanceof Integer) {
                    bidNumber = (Integer) params[0];
                } else if (params[0] instanceof WeighingSessionCreateRequest) {
                    bidNumber = ((WeighingSessionCreateRequest) params[0]).getBidNumber();
                }
            }
            return (bidNumber != null) ? (traderId + "::" + bidNumber) : (traderId + "::");
        };
    }
}
